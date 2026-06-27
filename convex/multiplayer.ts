import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { srsSnapshot } from "./srs";
import { bumpCounter, dayKey } from "./metrics";

// ── Skill-based matchmaking tuning ────────────────────────────────────────
// Players are paired when their SRS ratings are within SKILL_WINDOW. Provisional
// players (RD >= 150) have an uncertain rating, so we widen their window to find
// a game faster rather than stranding them — they settle into a tighter band as
// their RD shrinks. Callers widen progressively (×passes) when no match is found.
const SKILL_WINDOW = 200;
const PROVISIONAL_MULTIPLIER = 2;

function skillWindow(provisional: boolean, widen = 1): number {
  return SKILL_WINDOW * (provisional ? PROVISIONAL_MULTIPLIER : 1) * widen;
}

// Average SRS rating across rated human seats; undefined if none are rated.
function computeSrsAvg(
  seats: { userId?: string; srsRating?: number }[]
): number | undefined {
  const rated = seats.filter((s) => s.userId && typeof s.srsRating === "number");
  if (rated.length === 0) return undefined;
  return Math.round(rated.reduce((a, s) => a + (s.srsRating as number), 0) / rated.length);
}

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
        srsAvg: r.srsAvg,
        // Distinct opponent tiers seated at the table, so the lobby can show how
        // a player would stack up before joining.
        tiers: Array.from(
          new Set(
            r.seats
              .filter((s) => s.userId && s.srsTier)
              .map((s) => s.srsTier as string)
          )
        ),
        lastActionAt: r.lastActionAt,
      }));
  },
});

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) return null;
    // Exclude authoritative "state" snapshots: the lobby/activity feed never
    // renders them, and their payload is the full game state (every player's
    // hand). Returning them here both bloated this reactive query — which
    // re-fires on every move — and leaked hidden hands to all clients. Private
    // hand/table views go through gameEngine.getMyHand / getPublicState.
    const moves = await ctx.db
      .query("roomMoves")
      .withIndex("by_room_seq", (q) => q.eq("roomId", roomId))
      .order("desc")
      .filter((q) => q.neq(q.field("type"), "state"))
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
    const srs = await srsSnapshot(ctx, userId);

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
        srsRating: srs.rating,
        srsTier: srs.tier,
        srsProvisional: srs.provisional,
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
      srsAvg: computeSrsAvg(seats),
      lastActionAt: now,
      createdAt: now,
    });
    await bumpCounter(ctx, "activeRooms", 1);
    await bumpCounter(ctx, dayKey("roomsCreated"), 1);
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
    const srs = await srsSnapshot(ctx, userId);

    const seats = [...room.seats];
    seats[idx] = {
      ...seats[idx],
      userId,
      name,
      avatarSeed: profile?.avatarSeed ?? name,
      elo,
      srsRating: srs.rating,
      srsTier: srs.tier,
      srsProvisional: srs.provisional,
      ready: true,
      isAI: false,
    };
    const filledElo = seats.filter((x) => x.elo > 0);
    await ctx.db.patch(room._id, {
      seats,
      eloAvg: filledElo.length
        ? Math.round(filledElo.reduce((s, x) => s + x.elo, 0) / filledElo.length)
        : 0,
      srsAvg: computeSrsAvg(seats),
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
      await bumpCounter(ctx, "activeRooms", -1);
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
    await bumpCounter(ctx, dayKey("sessions"), 1);
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
    await bumpCounter(ctx, "activeRooms", -1);
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
    const srs = await srsSnapshot(ctx, userId);

    const existing = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        mode,
        elo,
        srsRating: srs.rating,
        srsProvisional: srs.provisional,
        joinedAt: Date.now(),
        matchedRoomId: undefined,
      });
      return { queueId: existing._id };
    }
    const id = await ctx.db.insert("matchmakingQueue", {
      userId,
      displayName: name,
      elo,
      srsRating: srs.rating,
      srsProvisional: srs.provisional,
      mode,
      joinedAt: Date.now(),
    });

    // Pair by SRS skill. Effective rating falls back to ELO for legacy queue
    // rows that predate SRS. The window is the wider of the two players' windows,
    // so a provisional player on either side relaxes the bound (find a game vs.
    // strand them). Older rows widen with their wait so nobody waits forever.
    //
    // We range-scan the by_mode_elo index over a generous band (the widest the
    // SRS window can ever open to) instead of collecting the whole mode queue,
    // then apply the precise per-pair SRS filter in JS. This keeps the cheap
    // indexed read while preserving correct skill-based pairing.
    const myRating = srs.rating;
    const MAX_WINDOW = SKILL_WINDOW * PROVISIONAL_MULTIPLIER * 3; // widest possible band
    const candidates = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_mode_elo", (q) =>
        q.eq("mode", mode).gte("elo", elo - MAX_WINDOW).lte("elo", elo + MAX_WINDOW)
      )
      .collect();
    const now0 = Date.now();
    const pool = candidates
      .filter((c) => {
        if (c.userId === userId || c.matchedRoomId) return false;
        const theirRating = c.srsRating ?? c.elo;
        const waitWiden = 1 + Math.min(2, (now0 - c.joinedAt) / 30_000); // up to ×3 after 60s
        const window = Math.max(
          skillWindow(srs.provisional),
          skillWindow(!!c.srsProvisional, waitWiden)
        );
        return Math.abs(theirRating - myRating) <= window;
      })
      .slice(0, 3);

    if (pool.length === 3) {
      const players = [
        { userId, displayName: name, elo, srsRating: srs.rating, srsTier: srs.tier, srsProvisional: srs.provisional, _id: id },
        ...pool.map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          elo: p.elo,
          srsRating: p.srsRating,
          srsTier: undefined as string | undefined,
          srsProvisional: p.srsProvisional,
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
        srsRating: p.srsRating,
        srsTier: p.srsTier,
        srsProvisional: p.srsProvisional,
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
        srsAvg: computeSrsAvg(seats),
        lastActionAt: now,
        createdAt: now,
      });
      await bumpCounter(ctx, "activeRooms", 1);
      await bumpCounter(ctx, dayKey("roomsCreated"), 1);
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

// ── SKILL-MATCHED QUICKPLAY (open-room based) ─────────────────────────────
// A lighter-weight alternative to the 4-player queue: instead of waiting for a
// full table to assemble, pair the player straight into the best already-open
// room within their SRS skill window. This keeps the manual room-code flow
// fully intact and simply adds a "play someone near my level now" path.

// Resolve the joining player's display identity + skill snapshot once.
async function loadSeatIdentity(ctx: any, user: any) {
  const userId = user._id as string;
  const profile = await profileFor(ctx, userId);
  const name = profile?.displayName ?? user.name ?? "Player";
  const elo = profile ? 1000 + profile.xp / 5 : 1200;
  const srs = await srsSnapshot(ctx, userId);
  return { userId, profile, name, elo, srs };
}

// Pick the best joinable open room for `userId` by SRS proximity. Scans waiting,
// non-private rooms that have a free human seat and the player is not already in,
// then widens the skill window over up to 3 passes before giving up. A room's
// effective rating is its `srsAvg` (falling back to `eloAvg` for legacy rooms).
async function bestSkillRoom(
  ctx: any,
  userId: string,
  srs: { rating: number; provisional: boolean }
) {
  const waiting = await ctx.db
    .query("rooms")
    .withIndex("by_status", (q: any) => q.eq("status", "waiting"))
    .take(100);
  const joinable = waiting.filter(
    (r: any) =>
      r.mode !== "private" &&
      r.hostUserId !== userId &&
      !r.seats.some((s: any) => s.userId === userId) &&
      r.seats.some((s: any) => !s.userId && !s.isAI)
  );
  if (joinable.length === 0) return null;
  for (let widen = 1; widen <= 3; widen++) {
    const window = skillWindow(srs.provisional, widen);
    const within = joinable
      .map((r: any) => ({ r, rating: r.srsAvg ?? r.eloAvg }))
      .filter((x: any) => Math.abs(x.rating - srs.rating) <= window)
      .sort(
        (a: any, b: any) =>
          Math.abs(a.rating - srs.rating) - Math.abs(b.rating - srs.rating)
      );
    if (within.length) return within[0].r;
  }
  return null;
}

/**
 * READ-ONLY preview of the best skill-matched open room for the signed-in
 * player, or null if none is within range. The lobby uses this to show "a table
 * near your level is open" before committing to a join.
 *
 * Signature: findSkillMatchedRoom() => {
 *   roomId, code, srsAvg, filled, openSeats, tiers, mode, hostName
 * } | null
 */
export const findSkillMatchedRoom = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx).catch(() => null);
    if (!user) return null;
    const userId = (user as any)._id as string;
    const srs = await srsSnapshot(ctx, userId);
    const room = await bestSkillRoom(ctx, userId, srs);
    if (!room) return null;
    return {
      roomId: room._id,
      code: room.code,
      mode: room.mode,
      hostName: room.hostName,
      srsAvg: room.srsAvg ?? room.eloAvg,
      filled: room.seats.filter((s: any) => s.userId || s.isAI).length,
      openSeats: room.seats.filter((s: any) => !s.userId && !s.isAI).length,
      myRating: Math.round(srs.rating),
      myTier: srs.tier,
      tiers: Array.from(
        new Set(
          room.seats
            .filter((s: any) => s.userId && s.srsTier)
            .map((s: any) => s.srsTier as string)
        )
      ),
    };
  },
});

/**
 * Skill-matched quickplay. Joins the best open room within the player's SRS
 * window; if none exists, seeds a fresh public "ranked" room they host so the
 * next searcher can match into them. Backward compatible — does not touch the
 * existing code-join or 4-player queue flows.
 *
 * Signature: quickplaySkillMatch() => { roomId, code, matched: boolean }
 */
export const quickplaySkillMatch = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getVerifiedUser(ctx);
    const { userId, profile, name, elo, srs } = await loadSeatIdentity(ctx, user);

    // 1) Try to join the closest open room within the skill window.
    const room = await bestSkillRoom(ctx, userId, srs);
    if (room) {
      const idx = room.seats.findIndex((s: any) => !s.userId && !s.isAI);
      if (idx !== -1) {
        const seats = [...room.seats];
        seats[idx] = {
          ...seats[idx],
          userId,
          name,
          avatarSeed: profile?.avatarSeed ?? name,
          elo,
          srsRating: srs.rating,
          srsTier: srs.tier,
          srsProvisional: srs.provisional,
          ready: true,
          isAI: false,
        };
        const filledElo = seats.filter((x: any) => x.elo > 0);
        await ctx.db.patch(room._id, {
          seats,
          eloAvg: filledElo.length
            ? Math.round(filledElo.reduce((s: number, x: any) => s + x.elo, 0) / filledElo.length)
            : 0,
          srsAvg: computeSrsAvg(seats),
          lastActionAt: Date.now(),
        });
        return { roomId: room._id as Id<"rooms">, code: room.code as string, matched: true };
      }
    }

    // 2) No match — seed a fresh public ranked room with open seats.
    let code = makeCode();
    for (let i = 0; i < 5; i++) {
      const exists = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q: any) => q.eq("code", code))
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
        srsRating: srs.rating,
        srsTier: srs.tier,
        srsProvisional: srs.provisional,
        ready: true,
        isAI: false,
        wind: WINDS[0],
      },
      ...[1, 2, 3].map((i) => ({
        userId: undefined,
        name: "Open Seat",
        avatarSeed: undefined,
        elo: 0,
        srsRating: undefined,
        srsTier: undefined,
        srsProvisional: undefined,
        ready: false,
        isAI: false,
        wind: WINDS[i],
      })),
    ];
    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      code,
      hostUserId: userId,
      hostName: name,
      mode: "ranked" as const,
      status: "waiting" as const,
      seats,
      eloAvg: Math.round(seats.reduce((s, x) => s + x.elo, 0) / seats.length),
      srsAvg: computeSrsAvg(seats),
      lastActionAt: now,
      createdAt: now,
    });
    await bumpCounter(ctx, "activeRooms", 1);
    await bumpCounter(ctx, dayKey("roomsCreated"), 1);
    return { roomId, code, matched: false };
  },
});
