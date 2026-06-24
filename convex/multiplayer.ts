import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

async function getAuthUser(ctx: any) {
  const u = await authComponent.getAuthUser(ctx);
  if (!u) throw new Error("Unauthenticated");
  return u as any;
}

// Ranked/leaderboard-affecting actions require a verified email to prevent
// sock-puppet account farming with addresses the user does not own.
async function getVerifiedUser(ctx: any) {
  const u = await getAuthUser(ctx);
  if (!u.emailVerified) throw new Error("Email verification required");
  return u;
}

const WINDS = ["E", "S", "W", "N"] as const;
const TURN_MS = 30_000;

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[buf[i] % chars.length];
  return s;
}

async function profileFor(ctx: any, userId: string) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();
}

// Allocate the next move-sequence number atomically via a counter on the room
// document, avoiding duplicate seq values under concurrent submissions (TOCTOU).
async function nextSeq(ctx: any, roomId: Id<"rooms">, room?: any): Promise<number> {
  const r = room ?? (await ctx.db.get(roomId));
  if (!r) throw new Error("Room not found");
  let base = r.moveSeq;
  if (base === undefined) {
    const last = await ctx.db
      .query("roomMoves")
      .withIndex("by_room_seq", (q: any) => q.eq("roomId", roomId))
      .order("desc")
      .first();
    base = last?.seq ?? -1;
  }
  const seq = base + 1;
  await ctx.db.patch(roomId, { moveSeq: seq });
  return seq;
}

// ── QUERIES ─────────────────────────────────────────────────────────────

export const listOpenTables = query({
  args: { mode: v.optional(v.union(v.literal("ranked"), v.literal("casual"))) },
  handler: async (ctx, { mode }) => {
    const rows = mode
      ? await ctx.db
          .query("rooms")
          .withIndex("by_mode_status", (q) => q.eq("mode", mode).eq("status", "waiting"))
          .order("desc")
          .take(30)
      : await ctx.db
          .query("rooms")
          .withIndex("by_status", (q) => q.eq("status", "waiting"))
          .order("desc")
          .take(30);
    return rows
      .filter((r) => r.mode !== "private")
      .map((r) => ({
        _id: r._id,
        code: r.code,
        host: r.hostName,
        mode: r.mode,
        seats: r.seats.length,
        filled: r.seats.filter((s) => s.userId || s.isAI).length,
        eloAvg: r.eloAvg,
        lastActionAt: r.lastActionAt,
      }));
  },
});

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) return null;
    const moves = await ctx.db
      .query("roomMoves")
      .withIndex("by_room_seq", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(40);
    return { room, recentMoves: moves.reverse() };
  },
});

export const getRoomByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    return room;
  },
});

export const myActiveRoom = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx).catch(() => null);
    if (!user) return null;
    const userId = (user as any)._id as string;
    // Look across waiting + in_progress
    const waiting = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .take(100);
    const live = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .take(100);
    return (
      [...waiting, ...live].find((r) => r.seats.some((s) => s.userId === userId)) ?? null
    );
  },
});

// ── MUTATIONS ───────────────────────────────────────────────────────────

export const createRoom = mutation({
  args: {
    mode: v.union(v.literal("ranked"), v.literal("casual"), v.literal("private")),
    fillWithAI: v.optional(v.boolean()),
  },
  handler: async (ctx, { mode, fillWithAI }) => {
    const user = await getVerifiedUser(ctx);
    const userId = user._id as string;
    const profile = await profileFor(ctx, userId);
    const name = profile?.displayName ?? user.name ?? "Player";
    const elo = profile ? 1000 + profile.xp / 5 : 1200;

    let code = makeCode();
    for (let i = 0; i < 5; i++) {
      const exists = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!exists) break;
      code = makeCode();
    }

    const seats = [
      {
        userId,
        name,
        avatarSeed: profile?.avatarSeed ?? name,
        elo,
        ready: true,
        isAI: false,
        wind: WINDS[0],
      },
      ...(fillWithAI
        ? [1, 2, 3].map((i) => ({
            userId: undefined,
            name: ["Jade Bot", "Bamboo Bot", "Crak Bot"][i - 1],
            avatarSeed: `bot-${i}`,
            elo: Math.round(elo + (Math.random() * 100 - 50)),
            ready: true,
            isAI: true,
            wind: WINDS[i],
          }))
        : [1, 2, 3].map((i) => ({
            userId: undefined,
            name: "Open Seat",
            avatarSeed: undefined,
            elo: 0,
            ready: false,
            isAI: false,
            wind: WINDS[i],
          }))),
    ];

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      code,
      hostUserId: userId,
      hostName: name,
      mode,
      status: "waiting",
      seats,
      eloAvg: Math.round(seats.reduce((s, x) => s + x.elo, 0) / seats.length),
      lastActionAt: now,
      createdAt: now,
    });
    return { roomId, code };
  },
});

export const joinRoom = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const user = await getVerifiedUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!room) throw new Error("Room not found");
    if (room.status === "abandoned" || room.status === "finished") {
      throw new Error("Room closed");
    }
    if (room.seats.some((s) => s.userId === userId)) {
      // Re-seat (reconnect) — already in
      return { roomId: room._id };
    }
    if (room.status !== "waiting") throw new Error("Game already in progress");
    const idx = room.seats.findIndex((s) => !s.userId && !s.isAI);
    if (idx === -1) throw new Error("Room is full");

    const profile = await profileFor(ctx, userId);
    const name = profile?.displayName ?? user.name ?? "Player";
    const elo = profile ? 1000 + profile.xp / 5 : 1200;

    const seats = [...room.seats];
    seats[idx] = {
      ...seats[idx],
      userId,
      name,
      avatarSeed: profile?.avatarSeed ?? name,
      elo,
      ready: true,
      isAI: false,
    };
    const filledElo = seats.filter((x) => x.elo > 0);
    await ctx.db.patch(room._id, {
      seats,
      eloAvg: filledElo.length
        ? Math.round(filledElo.reduce((s, x) => s + x.elo, 0) / filledElo.length)
        : 0,
      lastActionAt: Date.now(),
    });
    return { roomId: room._id };
  },
});

export const setReady = mutation({
  args: { roomId: v.id("rooms"), ready: v.boolean() },
  handler: async (ctx, { roomId, ready }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    const seats = room.seats.map((s) =>
      s.userId === userId ? { ...s, ready } : s
    );
    await ctx.db.patch(roomId, { seats, lastActionAt: Date.now() });
    return { ok: true };
  },
});

export const leaveRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) return { ok: true };

    if (room.hostUserId === userId && room.status === "waiting") {
      await ctx.db.patch(roomId, { status: "abandoned", lastActionAt: Date.now() });
      return { ok: true };
    }

    const seats = room.seats.map((s) =>
      s.userId === userId
        ? { ...s, userId: undefined, name: "Open Seat", ready: false, elo: 0, avatarSeed: undefined }
        : s
    );
    await ctx.db.patch(roomId, { seats, lastActionAt: Date.now() });
    return { ok: true };
  },
});

export const fillSeatsWithAI = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await getAuthUser(ctx);
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostUserId !== (user._id as string)) throw new Error("Not host");
    const seats = room.seats.map((s, i) =>
      !s.userId && !s.isAI
        ? {
            ...s,
            isAI: true,
            name: ["Jade Bot", "Bamboo Bot", "Crak Bot"][i % 3],
            avatarSeed: `bot-${i}`,
            elo: room.eloAvg || 1200,
            ready: true,
          }
        : s
    );
    await ctx.db.patch(roomId, { seats, lastActionAt: Date.now() });
    return { ok: true };
  },
});

export const startGame = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await getAuthUser(ctx);
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostUserId !== (user._id as string)) throw new Error("Not host");
    const filled = room.seats.every((s) => s.userId || s.isAI);
    if (!filled) throw new Error("Need 4 players or AI fill");
    const allReady = room.seats.every((s) => s.ready);
    if (!allReady) throw new Error("All players must be ready");
    await ctx.db.patch(roomId, {
      status: "in_progress",
      turnSeat: 0,
      turnDeadline: Date.now() + TURN_MS,
      lastActionAt: Date.now(),
    });
    await ctx.db.insert("roomMoves", {
      roomId,
      seq: 0,
      seat: 0,
      userId: room.seats[0].userId,
      type: "game_start",
      payload: JSON.stringify({ at: Date.now() }),
      at: Date.now(),
    });
    return { ok: true };
  },
});

export const submitMove = mutation({
  args: {
    roomId: v.id("rooms"),
    // Allowlist of in-turn game moves. Wins go exclusively through the validated
    // gameEngine.declareMahjong path and chat through sendChat, so "mahjong",
    // "state", and "chat" are intentionally NOT accepted here.
    type: v.union(
      v.literal("draw"),
      v.literal("discard"),
      v.literal("pung"),
      v.literal("kong"),
      v.literal("pass"),
    ),
    payload: v.string(),
  },
  handler: async (ctx, { roomId, type, payload }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.status !== "in_progress") throw new Error("Game not active");
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat === -1) throw new Error("Not seated");

    // Reject oversized or malformed payloads (must be a small JSON object).
    if (payload.length > 1000) throw new Error("Payload too large");
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Payload must be a JSON object");
      }
    } catch {
      throw new Error("Payload must be valid JSON");
    }

    if (room.turnSeat !== seat) {
      throw new Error("Not your turn");
    }

    const seq = await nextSeq(ctx, roomId, room);

    await ctx.db.insert("roomMoves", {
      roomId,
      seq,
      seat,
      userId,
      type,
      payload,
      at: Date.now(),
    });

    const nextSeat = (seat + 1) % 4;
    await ctx.db.patch(roomId, {
      turnSeat: nextSeat,
      turnDeadline: Date.now() + TURN_MS,
      lastActionAt: Date.now(),
    });
    return { seq };
  },
});

export const sendChat = mutation({
  args: { roomId: v.id("rooms"), text: v.string() },
  handler: async (ctx, { roomId, text }) => {
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return { ok: false };
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat === -1) throw new Error("Not seated");

    const seq = await nextSeq(ctx, roomId, room);

    await ctx.db.insert("roomMoves", {
      roomId,
      seq,
      seat,
      userId,
      type: "chat",
      payload: JSON.stringify({ text: trimmed }),
      at: Date.now(),
    });
    await ctx.db.patch(roomId, { lastActionAt: Date.now() });
    return { ok: true };
  },
});

// Force-advance turn if deadline passed (anyone in the room can call)
export const tickTurn = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    if (!room || room.status !== "in_progress") return { ok: false };
    if (!room.turnDeadline || room.turnDeadline > Date.now()) return { ok: false };
    const seat = room.turnSeat ?? 0;

    const seq = await nextSeq(ctx, roomId, room);
    await ctx.db.insert("roomMoves", {
      roomId,
      seq,
      seat,
      userId: room.seats[seat]?.userId,
      type: "timeout",
      payload: JSON.stringify({ at: Date.now() }),
      at: Date.now(),
    });
    await ctx.db.patch(roomId, {
      turnSeat: (seat + 1) % 4,
      turnDeadline: Date.now() + TURN_MS,
      lastActionAt: Date.now(),
    });
    return { ok: true };
  },
});

// Forfeit the game — used when a player concedes or disconnects. This ends the
// game WITHOUT crowning a winner or awarding ELO to anyone. Win declarations go
// exclusively through the validated gameEngine.declareMahjong path.
export const forfeitGame = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.status !== "in_progress") throw new Error("Game not active");
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat === -1) throw new Error("Not seated");

    await ctx.db.patch(roomId, {
      status: "finished",
      lastActionAt: Date.now(),
      turnDeadline: undefined,
    });
    const seq = await nextSeq(ctx, roomId, room);
    await ctx.db.insert("roomMoves", {
      roomId,
      seq,
      seat,
      userId,
      type: "forfeit",
      payload: JSON.stringify({ seat }),
      at: Date.now(),
    });
    return { ok: true };
  },
});

// ── MATCHMAKING ─────────────────────────────────────────────────────────

export const enterMatchmaking = mutation({
  args: { mode: v.union(v.literal("ranked"), v.literal("casual")) },
  handler: async (ctx, { mode }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const profile = await profileFor(ctx, userId);
    const elo = profile ? 1000 + profile.xp / 5 : 1200;
    const name = profile?.displayName ?? user.name ?? "Player";

    const existing = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { mode, elo, joinedAt: Date.now(), matchedRoomId: undefined });
      return { queueId: existing._id };
    }
    const id = await ctx.db.insert("matchmakingQueue", {
      userId,
      displayName: name,
      elo,
      mode,
      joinedAt: Date.now(),
    });

    // Try matching with up to 3 others within ±150 ELO
    const candidates = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_mode_elo", (q) => q.eq("mode", mode))
      .collect();
    const pool = candidates
      .filter((c) => c.userId !== userId && !c.matchedRoomId && Math.abs(c.elo - elo) <= 150)
      .slice(0, 3);

    if (pool.length === 3) {
      const players = [
        { userId, displayName: name, elo, _id: id },
        ...pool.map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          elo: p.elo,
          _id: p._id,
        })),
      ];
      const code = makeCode();
      const now = Date.now();
      const seats = players.map((p, i) => ({
        userId: p.userId,
        name: p.displayName,
        avatarSeed: p.displayName,
        elo: p.elo,
        ready: true,
        isAI: false,
        wind: WINDS[i],
      }));
      const roomId = await ctx.db.insert("rooms", {
        code,
        hostUserId: userId,
        hostName: name,
        mode,
        status: "waiting",
        seats,
        eloAvg: Math.round(seats.reduce((s, x) => s + x.elo, 0) / 4),
        lastActionAt: now,
        createdAt: now,
      });
      for (const p of players) {
        await ctx.db.patch(p._id as Id<"matchmakingQueue">, { matchedRoomId: roomId });
      }
      return { queueId: id, matchedRoomId: roomId };
    }
    return { queueId: id };
  },
});

export const leaveMatchmaking = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const existing = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

export const myMatchmakingStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx).catch(() => null);
    if (!user) return null;
    const userId = (user as any)._id as string;
    const row = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!row) return null;
    return {
      queueId: row._id,
      mode: row.mode,
      joinedAt: row.joinedAt,
      matchedRoomId: row.matchedRoomId ?? null,
      waitingMs: Date.now() - row.joinedAt,
    };
  },
});

// Acknowledge match — pulls user from queue once they enter the matched room
export const ackMatched = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const existing = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing && existing.matchedRoomId) {
      await ctx.db.delete(existing._id);
    }
    return { ok: true };
  },
});
