import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

// ─────────────────────────────────────────────────────────────────────────
// Internal proxies that re-invoke the canonical engine handlers using
// the same auth context. These exist so the public `submitIntent` entry
// in edgeSecurity.ts can stay narrow and route everything through the
// authoritative game engine.
// ─────────────────────────────────────────────────────────────────────────

async function loadState(ctx: any, roomId: Id<"rooms">) {
  const row = await ctx.db
    .query("roomMoves")
    .withIndex("by_room_seq", (q: any) => q.eq("roomId", roomId))
    .order("desc")
    .filter((q: any) => q.eq(q.field("type"), "state"))
    .first();
  if (!row) return null;
  try {
    return JSON.parse(row.payload);
  } catch {
    return null;
  }
}

async function appendMove(
  ctx: any,
  roomId: Id<"rooms">,
  seat: number,
  userId: string | undefined,
  type: string,
  payload: any
) {
  const last = await ctx.db
    .query("roomMoves")
    .withIndex("by_room_seq", (q: any) => q.eq("roomId", roomId))
    .order("desc")
    .first();
  const seq = (last?.seq ?? -1) + 1;
  await ctx.db.insert("roomMoves", {
    roomId,
    seq,
    seat,
    userId,
    type,
    payload: typeof payload === "string" ? payload : JSON.stringify(payload),
    at: Date.now(),
  });
}

async function getSeat(ctx: any, roomId: Id<"rooms">) {
  const user = await authComponent.getAuthUser(ctx);
  if (!user) throw new Error("Unauthenticated");
  const userId = (user as any)._id as string;
  const room = await ctx.db.get(roomId);
  if (!room) throw new Error("Room not found");
  const seat = room.seats.findIndex((s: any) => s.userId === userId);
  if (seat === -1) throw new Error("Not seated");
  return { user, userId, room, seat };
}

export const proxyDraw = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const { userId, seat } = await getSeat(ctx, roomId);
    const state = await loadState(ctx, roomId);
    if (!state) throw new Error("Game not initialized");
    if (state.finished) throw new Error("Game finished");
    if (state.turnSeat !== seat) throw new Error("Not your turn");
    if (state.drawnTile) throw new Error("Already drew this turn");
    if (state.wall.length === 0) {
      state.finished = true;
      await appendMove(ctx, roomId, seat, userId, "state", state);
      return { ok: true, walled: true };
    }
    let drawn = state.wall.shift();
    while (drawn && drawn.startsWith("F") && state.wall.length > 0) {
      state.flowers[seat].push(drawn);
      drawn = state.wall.shift();
    }
    state.hands[seat].push(drawn);
    state.hands[seat].sort();
    state.drawnTile = drawn;
    await appendMove(ctx, roomId, seat, userId, "state", state);
    await appendMove(ctx, roomId, seat, userId, "draw", { at: Date.now() });
    return { ok: true };
  },
});

export const proxyDiscard = internalMutation({
  args: { roomId: v.id("rooms"), tile: v.string() },
  handler: async (ctx, { roomId, tile }) => {
    const { userId, seat } = await getSeat(ctx, roomId);
    const state = await loadState(ctx, roomId);
    if (!state) throw new Error("Game not initialized");
    if (state.finished) throw new Error("Game finished");
    if (state.turnSeat !== seat) throw new Error("Not your turn");
    const idx = state.hands[seat].indexOf(tile);
    if (idx === -1) throw new Error("Tile not in hand");
    state.hands[seat].splice(idx, 1);
    state.discards.push(tile);
    state.drawnTile = null;
    state.pendingDiscard = { tile, fromSeat: seat, at: Date.now() };
    state.turnSeat = (seat + 1) % 4;
    await appendMove(ctx, roomId, seat, userId, "state", state);
    await appendMove(ctx, roomId, seat, userId, "discard", { tile });
    await ctx.db.patch(roomId, {
      turnSeat: state.turnSeat,
      turnDeadline: Date.now() + 30_000,
      lastActionAt: Date.now(),
    });
    return { ok: true };
  },
});

export const proxyCall = internalMutation({
  args: {
    roomId: v.id("rooms"),
    tile: v.string(),
    callType: v.union(v.literal("pung"), v.literal("kong")),
  },
  handler: async (ctx, { roomId, tile, callType }) => {
    const { userId, seat } = await getSeat(ctx, roomId);
    const state = await loadState(ctx, roomId);
    if (!state) throw new Error("Game not initialized");
    if (state.finished) throw new Error("Game finished");
    if (!state.pendingDiscard) throw new Error("No discard available");
    if (state.pendingDiscard.tile !== tile) throw new Error("Tile mismatch");
    if (state.pendingDiscard.fromSeat === seat) throw new Error("Cannot call own discard");
    const need = callType === "pung" ? 2 : 3;
    const matches = state.hands[seat].filter((t: string) => t === tile || t === "J");
    if (matches.length < need) throw new Error("Not enough matching tiles");
    const set = [tile];
    let removed = 0;
    state.hands[seat] = state.hands[seat].filter((t: string) => {
      if (removed < need && (t === tile || t === "J")) {
        set.push(t);
        removed++;
        return false;
      }
      return true;
    });
    const lastIdx = state.discards.lastIndexOf(tile);
    if (lastIdx >= 0) state.discards.splice(lastIdx, 1);
    state.exposed[seat].push(set.join("-"));
    state.pendingDiscard = null;
    state.turnSeat = seat;
    state.drawnTile = null;
    await appendMove(ctx, roomId, seat, userId, "state", state);
    await appendMove(ctx, roomId, seat, userId, `call_${callType}`, { tile });
    await ctx.db.patch(roomId, {
      turnSeat: seat,
      turnDeadline: Date.now() + 30_000,
      lastActionAt: Date.now(),
    });
    return { ok: true };
  },
});

export const proxyMahjong = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const { userId, seat, room } = await getSeat(ctx, roomId);
    const state = await loadState(ctx, roomId);
    if (!state) throw new Error("Game not initialized");
    if (state.finished) throw new Error("Already finished");
    const totalTiles =
      state.hands[seat].length +
      state.exposed[seat].reduce(
        (n: number, s: string) => n + s.split("-").length,
        0
      );
    if (totalTiles !== 14) {
      throw new Error(`Invalid hand size for mahjong: ${totalTiles}/14`);
    }
    state.finished = true;
    state.winnerSeat = seat;
    await appendMove(ctx, roomId, seat, userId, "state", state);
    await appendMove(ctx, roomId, seat, userId, "mahjong", { points: 25 });
    await ctx.db.patch(roomId, {
      status: "finished",
      lastActionAt: Date.now(),
      turnDeadline: undefined,
    });
    const startedAt = state.startedAt ?? Date.now();
    const durationMs = Date.now() - startedAt;
    for (let i = 0; i < room.seats.length; i++) {
      const s = room.seats[i];
      if (!s.userId) continue;
      await ctx.db.insert("gameResults", {
        userId: s.userId,
        won: i === seat,
        points: i === seat ? 25 : 0,
        durationMs,
        playedAt: Date.now(),
      });
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q: any) => q.eq("userId", s.userId))
        .unique();
      if (profile) {
        const delta = room.mode === "ranked" ? 15 : 5;
        const xpDelta = i === seat ? delta * 4 : Math.floor(-delta / 2);
        await ctx.db.patch(profile._id, {
          xp: Math.max(0, profile.xp + xpDelta),
          gamesPlayed: profile.gamesPlayed + 1,
          gamesWon: profile.gamesWon + (i === seat ? 1 : 0),
          updatedAt: Date.now(),
        });
      }
    }
    return { ok: true };
  },
});
