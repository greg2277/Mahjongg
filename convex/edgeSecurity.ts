import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

// ─────────────────────────────────────────────────────────────────────────
// EDGE SECURITY LAYER
//
// Server-authoritative validation, rate limiting, and anti-cheat.
// All gameplay actions funnel through here. Clients never decide
// outcomes — the engine in gameEngine.ts owns the canonical state and
// these helpers enforce integrity at the network boundary.
// ─────────────────────────────────────────────────────────────────────────

// ── RATE LIMITER (per-user, sliding window) ─────────────────────────────
// Database-backed so the limit survives cold starts and is shared across
// concurrent isolates. State lives in the `rateLimits` table; the atomic
// read-modify-write below relies on Convex OCC to serialize per-key updates.
const RL_WINDOW_MS = 10_000;
const RL_MAX_PER_WINDOW = 30;

async function checkRate(
  ctx: any,
  userId: string,
): Promise<{ ok: boolean; remaining: number }> {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q: any) => q.eq("key", userId))
    .unique();
  const recent = (existing?.hits ?? []).filter(
    (t: number) => now - t < RL_WINDOW_MS,
  );

  if (recent.length >= RL_MAX_PER_WINDOW) {
    if (existing) await ctx.db.patch(existing._id, { hits: recent });
    return { ok: false, remaining: 0 };
  }

  recent.push(now);
  if (existing) await ctx.db.patch(existing._id, { hits: recent });
  else await ctx.db.insert("rateLimits", { key: userId, hits: recent });
  return { ok: true, remaining: RL_MAX_PER_WINDOW - recent.length };
}

// ── HEARTBEAT / TURN WATCHDOG ───────────────────────────────────────────
// Scans active rooms whose turn deadline has passed and force-advances them.
// Mirrors what `tickTurn` does in multiplayer.ts but is invoked by a cron
// so abandoned tables auto-progress without any client poking them.

export const sweepStalledTurns = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .take(100);
    let advanced = 0;
    let abandoned = 0;
    for (const room of rooms) {
      // Abandon rooms with no activity for 10 minutes
      if (now - room.lastActionAt > 10 * 60_000) {
        await ctx.db.patch(room._id, {
          status: "abandoned",
          lastActionAt: now,
          turnDeadline: undefined,
        });
        abandoned++;
        continue;
      }
      if (!room.turnDeadline || room.turnDeadline > now) continue;
      const seat = room.turnSeat ?? 0;

      const last = await ctx.db
        .query("roomMoves")
        .withIndex("by_room_seq", (q) => q.eq("roomId", room._id))
        .order("desc")
        .first();
      const seq = (last?.seq ?? -1) + 1;
      await ctx.db.insert("roomMoves", {
        roomId: room._id,
        seq,
        seat,
        userId: room.seats[seat]?.userId,
        type: "timeout",
        payload: JSON.stringify({ at: now, reason: "watchdog" }),
        at: now,
      });
      await ctx.db.patch(room._id, {
        turnSeat: (seat + 1) % 4,
        turnDeadline: now + 30_000,
        lastActionAt: now,
      });
      advanced++;
    }
    return { advanced, abandoned, scanned: rooms.length };
  },
});

// Manual trigger (useful for debugging / dashboards). Admin-only: an ordinary
// authenticated user must not be able to drive the global room watchdog.
export const runWatchdogNow = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx).catch(() => null);
    if (!user || (user as { role?: string }).role !== "admin") {
      throw new Error("Unauthorized");
    }
    await ctx.scheduler.runAfter(0, internal.edgeSecurity.sweepStalledTurns, {});
    return { ok: true };
  },
});

// ── ANTI-CHEAT: DEEP AUDIT ──────────────────────────────────────────────
// Re-scans the move log and flags any integrity violations.

type Violation = { seq: number; seat: number; reason: string; severity: "low" | "med" | "high" };

export const deepAudit = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) return null;
    const moves = await ctx.db
      .query("roomMoves")
      .withIndex("by_room_seq", (q) => q.eq("roomId", roomId))
      .collect();

    const violations: Violation[] = [];
    let lastSeq = -1;
    let lastDiscardSeat = -1;
    const submitTimesBySeat: Record<number, number[]> = {};
    const turnSeats: number[] = [];

    for (const m of moves) {
      // Sequence integrity
      if (m.seq !== lastSeq + 1) {
        violations.push({
          seq: m.seq,
          seat: m.seat,
          reason: `sequence gap (expected ${lastSeq + 1})`,
          severity: "high",
        });
      }
      lastSeq = m.seq;

      // Authentication: every gameplay move must have a userId or be AI seat
      if (
        m.type !== "deal" &&
        m.type !== "state" &&
        m.type !== "wall_empty" &&
        m.type !== "timeout" &&
        m.type !== "game_start" &&
        !m.userId
      ) {
        const seat = room.seats[m.seat];
        if (!seat?.isAI) {
          violations.push({
            seq: m.seq,
            seat: m.seat,
            reason: "unauthenticated gameplay move",
            severity: "high",
          });
        }
      }

      // Identity check: userId must match the seated user
      if (m.userId && m.type !== "chat") {
        const seat = room.seats[m.seat];
        if (seat?.userId && seat.userId !== m.userId) {
          violations.push({
            seq: m.seq,
            seat: m.seat,
            reason: `seat impersonation: ${m.userId} acting on seat owned by ${seat.userId}`,
            severity: "high",
          });
        }
      }

      // Two discards in a row from same seat → impossible
      if (m.type === "discard") {
        if (m.seat === lastDiscardSeat) {
          violations.push({
            seq: m.seq,
            seat: m.seat,
            reason: "consecutive discards from same seat",
            severity: "high",
          });
        }
        lastDiscardSeat = m.seat;
        turnSeats.push(m.seat);
      }

      // Burst rate (more than 6 moves in 2s from same seat)
      submitTimesBySeat[m.seat] ??= [];
      submitTimesBySeat[m.seat].push(m.at);
      const recent = submitTimesBySeat[m.seat].filter((t) => m.at - t < 2_000);
      if (recent.length > 6) {
        violations.push({
          seq: m.seq,
          seat: m.seat,
          reason: `burst (${recent.length} moves in 2s)`,
          severity: "med",
        });
      }
    }

    // Turn rotation sanity: discards should rotate (allowing pung/kong jumps)
    let outOfOrder = 0;
    for (let i = 1; i < turnSeats.length; i++) {
      const expected = (turnSeats[i - 1] + 1) % 4;
      if (turnSeats[i] !== expected) outOfOrder++;
    }

    return {
      totalMoves: moves.length,
      violations,
      summary: {
        high: violations.filter((v) => v.severity === "high").length,
        med: violations.filter((v) => v.severity === "med").length,
        low: violations.filter((v) => v.severity === "low").length,
        unusualTurnJumps: outOfOrder,
      },
    };
  },
});

// ── PROTECTED INTENT WRAPPER ────────────────────────────────────────────
// Single entry point clients call; server validates auth + rate + room
// state before executing the action.

export const submitIntent = mutation({
  args: {
    roomId: v.id("rooms"),
    intent: v.union(
      v.literal("draw"),
      v.literal("discard"),
      v.literal("pung"),
      v.literal("kong"),
      v.literal("mahjong")
    ),
    tile: v.optional(v.string()),
  },
  handler: async (ctx, { roomId, intent, tile }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthenticated");
    const userId = (user as any)._id as string;

    const rate = await checkRate(ctx, userId);
    if (!rate.ok) throw new Error("Rate limit exceeded — slow down");

    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.status !== "in_progress") throw new Error("Game not active");
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat === -1) throw new Error("Not seated");

    // Routes to the canonical engine. We forward via runMutation so the
    // engine remains the only writer of game state.
    switch (intent) {
      case "draw":
        await ctx.runMutation(internal.edgeSecurityActions.proxyDraw, { roomId });
        return { ok: true };
      case "discard":
        if (!tile) throw new Error("tile required for discard");
        await ctx.runMutation(internal.edgeSecurityActions.proxyDiscard, { roomId, tile });
        return { ok: true };
      case "pung":
      case "kong":
        if (!tile) throw new Error("tile required for call");
        await ctx.runMutation(internal.edgeSecurityActions.proxyCall, {
          roomId,
          tile,
          callType: intent,
        });
        return { ok: true };
      case "mahjong":
        await ctx.runMutation(internal.edgeSecurityActions.proxyMahjong, { roomId });
        return { ok: true };
    }
  },
});
