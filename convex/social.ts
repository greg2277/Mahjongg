import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

// ─────────────────────────────────────────────────────────────────────────
// Social layer: emoji reactions, spectators, replay viewing.
// Built on the existing roomMoves log so everything stays auditable.
// ─────────────────────────────────────────────────────────────────────────

async function getAuthUser(ctx: any) {
  const u = await authComponent.getAuthUser(ctx);
  if (!u) throw new Error("Unauthenticated");
  return u as any;
}

// ── EMOJI REACTIONS ─────────────────────────────────────────────────────

export const sendReaction = mutation({
  args: { roomId: v.id("rooms"), emoji: v.string() },
  handler: async (ctx, { roomId, emoji }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const allowed = ["👍", "👏", "🔥", "🎉", "🀄", "😅", "😱", "🧧"];
    if (!allowed.includes(emoji)) throw new Error("Invalid emoji");
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    const seat = room.seats.findIndex((s) => s.userId === userId);
    // Spectators have seat -1; allow them too
    const last = await ctx.db
      .query("roomMoves")
      .withIndex("by_room_seq", (q) => q.eq("roomId", roomId))
      .order("desc")
      .first();
    const seq = (last?.seq ?? -1) + 1;
    await ctx.db.insert("roomMoves", {
      roomId,
      seq,
      seat: seat === -1 ? 99 : seat,
      userId,
      type: "reaction",
      payload: JSON.stringify({ emoji, name: user.name ?? "Player" }),
      at: Date.now(),
    });
    await ctx.db.patch(roomId, { lastActionAt: Date.now() });
    return { ok: true };
  },
});

// ── SPECTATORS ──────────────────────────────────────────────────────────

export const joinAsSpectator = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.mode === "private") throw new Error("Private rooms don't allow spectators");
    if (room.seats.some((s) => s.userId === userId)) {
      return { ok: true, alreadySeated: true };
    }
    const last = await ctx.db
      .query("roomMoves")
      .withIndex("by_room_seq", (q) => q.eq("roomId", roomId))
      .order("desc")
      .first();
    const seq = (last?.seq ?? -1) + 1;
    await ctx.db.insert("roomMoves", {
      roomId,
      seq,
      seat: 99,
      userId,
      type: "spectator_join",
      payload: JSON.stringify({ name: user.name ?? "Watcher" }),
      at: Date.now(),
    });
    return { ok: true };
  },
});

export const listSpectators = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const moves = await ctx.db
      .query("roomMoves")
      .withIndex("by_room_seq", (q) => q.eq("roomId", roomId))
      .filter((q) => q.eq(q.field("type"), "spectator_join"))
      .collect();
    const seen = new Map<string, { userId: string; name: string; at: number }>();
    for (const m of moves) {
      if (!m.userId) continue;
      try {
        const p = JSON.parse(m.payload);
        seen.set(m.userId, { userId: m.userId, name: p.name ?? "Watcher", at: m.at });
      } catch {}
    }
    return Array.from(seen.values()).slice(0, 20);
  },
});

// ── REPLAY VIEWER ───────────────────────────────────────────────────────

export const getReplay = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await authComponent.getAuthUser(ctx).catch(() => null);
    if (!user) throw new Error("Unauthenticated");
    const userId = (user as any)._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) return null;
    // Replays are personal game history — only seats that played may view them.
    if (!room.seats.some((s) => s.userId === userId)) {
      throw new Error("Not a participant in this game");
    }
    const moves = await ctx.db
      .query("roomMoves")
      .withIndex("by_room_seq", (q) => q.eq("roomId", roomId))
      .collect();
    // Hide raw state snapshots from replay (they leak hands)
    const visible = moves.filter((m) => m.type !== "state");
    return {
      room: {
        _id: room._id,
        code: room.code,
        host: room.hostName,
        mode: room.mode,
        status: room.status,
        seats: room.seats.map((s) => ({
          name: s.name,
          wind: s.wind,
          isAI: s.isAI,
          elo: s.elo,
        })),
        createdAt: room.createdAt,
      },
      timeline: visible.map((m) => {
        let parsed: any = null;
        try {
          parsed = JSON.parse(m.payload);
        } catch {}
        return {
          seq: m.seq,
          seat: m.seat,
          type: m.type,
          at: m.at,
          payload: parsed,
        };
      }),
    };
  },
});

// List finished games the user participated in (replay history)
export const listMyReplays = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx).catch(() => null);
    if (!user) return [];
    const userId = (user as any)._id as string;
    const finished = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "finished"))
      .order("desc")
      .take(50);
    return finished
      .filter((r) => r.seats.some((s) => s.userId === userId))
      .slice(0, 20)
      .map((r) => {
        const mySeat = r.seats.findIndex((s) => s.userId === userId);
        return {
          _id: r._id,
          code: r.code,
          mode: r.mode,
          mySeat,
          seats: r.seats.map((s) => ({ name: s.name, wind: s.wind, isAI: s.isAI })),
          finishedAt: r.lastActionAt,
        };
      });
  },
});
