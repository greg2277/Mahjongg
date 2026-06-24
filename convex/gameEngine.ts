import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { validateWinningHand, validateExposure, CURRENT_CARD_YEAR } from "./nmjlValidation";

// ─────────────────────────────────────────────────────────────────────────
// AUTHORITATIVE GAME ENGINE
//
// All game state lives server-side. Clients never decide outcomes — they
// only submit intents (draw, discard, call, mahjong) which the server
// validates against the canonical state. This prevents cheating via
// client tampering.
// ─────────────────────────────────────────────────────────────────────────

// Deterministic seeded RNG so games are replayable.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// American mahjong wall = 152 tiles (incl. 8 jokers, 8 flowers).
function buildWall(seed: number): string[] {
  const tiles: string[] = [];
  const suits = ["B", "C", "D"]; // Bam, Crak, Dot
  for (const s of suits) {
    for (let n = 1; n <= 9; n++) {
      for (let r = 0; r < 4; r++) tiles.push(`${s}${n}`);
    }
  }
  // Winds (E S W N) x4
  for (const w of ["E", "S", "W", "N"]) for (let r = 0; r < 4; r++) tiles.push(`W${w}`);
  // Dragons (Red, Green, White) x4
  for (const d of ["R", "G", "Wh"]) for (let r = 0; r < 4; r++) tiles.push(`D${d}`);
  // Flowers x8
  for (let i = 0; i < 8; i++) tiles.push(`F${i + 1}`);
  // Jokers x8
  for (let i = 0; i < 8; i++) tiles.push("J");

  const rng = mulberry32(seed);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

type GameState = {
  wall: string[]; // remaining tiles (deal from front)
  discards: string[];
  hands: string[][]; // 4 hands
  exposed: string[][]; // 4 exposed sets
  flowers: string[][]; // 4 flower piles
  turnSeat: number;
  // pendingDiscard: tile a player just discarded; others can call within window
  pendingDiscard?: { tile: string; fromSeat: number; at: number } | null;
  drawnTile?: string | null; // tile in current player's hand pending discard
  seed: number;
  startedAt: number;
  finished: boolean;
  winnerSeat?: number;
};

async function getAuthUser(ctx: any) {
  const u = await authComponent.getAuthUser(ctx);
  if (!u) throw new Error("Unauthenticated");
  return u as any;
}

async function loadState(ctx: any, roomId: Id<"rooms">): Promise<GameState | null> {
  const row = await ctx.db
    .query("roomMoves")
    .withIndex("by_room_seq", (q: any) => q.eq("roomId", roomId))
    .order("desc")
    .filter((q: any) => q.eq(q.field("type"), "state"))
    .first();
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as GameState;
  } catch {
    return null;
  }
}

// Allocate the next move-sequence number atomically via a counter on the room
// document. Because every allocation patches room.moveSeq, two concurrent
// mutations conflict on the same document and Convex's OCC retries one of them,
// guaranteeing unique, gap-free seq values (no TOCTOU duplicates).
async function nextSeq(ctx: any, roomId: Id<"rooms">): Promise<number> {
  const room = await ctx.db.get(roomId);
  if (!room) throw new Error("Room not found");
  let base = room.moveSeq;
  if (base === undefined) {
    // Legacy room created before the counter existed: seed from the move log.
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

async function appendMove(
  ctx: any,
  roomId: Id<"rooms">,
  seat: number,
  userId: string | undefined,
  type: string,
  payload: any
) {
  const seq = await nextSeq(ctx, roomId);
  await ctx.db.insert("roomMoves", {
    roomId,
    seq,
    seat,
    userId,
    type,
    payload: typeof payload === "string" ? payload : JSON.stringify(payload),
    at: Date.now(),
  });
  return seq;
}

// ── INITIALIZE GAME ─────────────────────────────────────────────────────

export const initializeGame = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await getAuthUser(ctx);
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostUserId !== (user._id as string)) throw new Error("Not host");
    if (room.status !== "in_progress") throw new Error("Game not started");

    const existing = await loadState(ctx, roomId);
    if (existing) return { ok: true, alreadyInitialized: true };

    const seedBuf = new Uint32Array(1);
    crypto.getRandomValues(seedBuf);
    const seed = seedBuf[0];
    const wall = buildWall(seed);
    const hands: string[][] = [[], [], [], []];
    const flowers: string[][] = [[], [], [], []];

    // Deal 13 tiles each (East gets 14)
    for (let r = 0; r < 13; r++) {
      for (let s = 0; s < 4; s++) hands[s].push(wall.shift()!);
    }
    hands[0].push(wall.shift()!); // East gets 14th tile

    // Move flowers from hands to flower piles, redraw replacements
    for (let s = 0; s < 4; s++) {
      const keep: string[] = [];
      for (const t of hands[s]) {
        if (t.startsWith("F")) flowers[s].push(t);
        else keep.push(t);
      }
      while (keep.length < (s === 0 ? 14 : 13) && wall.length > 0) {
        const t = wall.shift()!;
        if (t.startsWith("F")) flowers[s].push(t);
        else keep.push(t);
      }
      hands[s] = keep.sort();
    }

    const state: GameState = {
      wall,
      discards: [],
      hands,
      exposed: [[], [], [], []],
      flowers,
      turnSeat: 0,
      pendingDiscard: null,
      drawnTile: hands[0][hands[0].length - 1],
      seed,
      startedAt: Date.now(),
      finished: false,
    };

    await appendMove(ctx, roomId, 0, room.seats[0].userId, "state", state);
    await appendMove(ctx, roomId, 0, room.seats[0].userId, "deal", {
      seed,
      tilesDealt: 53,
      wallRemaining: wall.length,
    });
    return { ok: true, seed };
  },
});

// ── GET MY HAND (private — only my own seat) ────────────────────────────

export const getMyHand = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await authComponent.getAuthUser(ctx).catch(() => null);
    if (!user) return null;
    const userId = (user as any)._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) return null;
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat === -1) return null;

    const state = await loadState(ctx, roomId);
    if (!state) return null;

    return {
      seat,
      hand: state.hands[seat],
      flowers: state.flowers[seat],
      exposed: state.exposed[seat],
      drawnTile: state.turnSeat === seat ? state.drawnTile : null,
    };
  },
});

// Public table view — does NOT leak other hands
export const getPublicState = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const state = await loadState(ctx, roomId);
    if (!state) return null;
    return {
      discards: state.discards,
      exposed: state.exposed,
      flowers: state.flowers,
      handCounts: state.hands.map((h) => h.length),
      wallRemaining: state.wall.length,
      turnSeat: state.turnSeat,
      pendingDiscard: state.pendingDiscard,
      finished: state.finished,
      winnerSeat: state.winnerSeat,
    };
  },
});

// ── ACTIONS (server-authoritative) ──────────────────────────────────────

async function assertTurn(state: GameState, seat: number) {
  if (state.finished) throw new Error("Game is finished");
  if (state.turnSeat !== seat) throw new Error("Not your turn");
}

async function persistState(ctx: any, roomId: Id<"rooms">, seat: number, userId: string | undefined, state: GameState) {
  await appendMove(ctx, roomId, seat, userId, "state", state);
}

export const drawTile = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat === -1) throw new Error("Not seated");

    const state = await loadState(ctx, roomId);
    if (!state) throw new Error("Game not initialized");
    await assertTurn(state, seat);

    if (state.drawnTile) throw new Error("Already drew this turn — discard first");
    if (state.wall.length === 0) {
      state.finished = true;
      await persistState(ctx, roomId, seat, userId, state);
      await appendMove(ctx, roomId, seat, userId, "wall_empty", { at: Date.now() });
      return { ok: true, drawn: null, walled: true };
    }
    let drawn = state.wall.shift()!;
    // Auto-replace flowers
    while (drawn && drawn.startsWith("F") && state.wall.length > 0) {
      state.flowers[seat].push(drawn);
      drawn = state.wall.shift()!;
    }
    state.hands[seat].push(drawn);
    state.hands[seat].sort();
    state.drawnTile = drawn;

    await persistState(ctx, roomId, seat, userId, state);
    await appendMove(ctx, roomId, seat, userId, "draw", { at: Date.now() });
    return { ok: true, drawn };
  },
});

export const discardTile = mutation({
  args: { roomId: v.id("rooms"), tile: v.string() },
  handler: async (ctx, { roomId, tile }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat === -1) throw new Error("Not seated");

    const state = await loadState(ctx, roomId);
    if (!state) throw new Error("Game not initialized");
    await assertTurn(state, seat);

    const idx = state.hands[seat].indexOf(tile);
    if (idx === -1) throw new Error("Tile not in hand");

    state.hands[seat].splice(idx, 1);
    state.discards.push(tile);
    state.drawnTile = null;
    state.pendingDiscard = { tile, fromSeat: seat, at: Date.now() };
    state.turnSeat = (seat + 1) % 4;

    await persistState(ctx, roomId, seat, userId, state);
    await appendMove(ctx, roomId, seat, userId, "discard", { tile });
    await ctx.db.patch(roomId, {
      turnSeat: state.turnSeat,
      turnDeadline: Date.now() + 30_000,
      lastActionAt: Date.now(),
    });
    return { ok: true, tile };
  },
});

export const callPungOrKong = mutation({
  args: {
    roomId: v.id("rooms"),
    type: v.union(v.literal("pung"), v.literal("kong")),
    tile: v.string(),
  },
  handler: async (ctx, { roomId, type, tile }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat === -1) throw new Error("Not seated");

    const state = await loadState(ctx, roomId);
    if (!state) throw new Error("Game not initialized");
    if (state.finished) throw new Error("Game finished");
    if (!state.pendingDiscard) throw new Error("No discard available");
    if (state.pendingDiscard.tile !== tile) throw new Error("Tile mismatch");
    if (state.pendingDiscard.fromSeat === seat) throw new Error("Cannot call own discard");

    const need = type === "pung" ? 2 : 3;
    const matches = state.hands[seat].filter((t) => t === tile || t === "J");
    if (matches.length < need) throw new Error("Not enough matching tiles");
    // NMJL: jokers cannot be called from a discard, and a called group must
    // contain at least one real (non-joker) copy of the discarded tile.
    if (tile === "J") throw new Error("Cannot call a joker discard");
    const realCopies = state.hands[seat].filter((t) => t === tile).length;
    if (realCopies < 1) throw new Error("Must hold a real copy of the called tile");

    // Remove matching tiles from hand, add exposed set
    const set: string[] = [tile];
    let removed = 0;
    state.hands[seat] = state.hands[seat].filter((t) => {
      if (removed < need && (t === tile || t === "J")) {
        set.push(t);
        removed++;
        return false;
      }
      return true;
    });
    // Remove called tile from discards
    const lastDiscardIdx = state.discards.lastIndexOf(tile);
    if (lastDiscardIdx >= 0) state.discards.splice(lastDiscardIdx, 1);

    state.exposed[seat].push(set.join("-"));
    state.pendingDiscard = null;
    state.turnSeat = seat; // caller now needs to discard
    state.drawnTile = null;

    await persistState(ctx, roomId, seat, userId, state);
    await appendMove(ctx, roomId, seat, userId, `call_${type}`, { tile });
    await ctx.db.patch(roomId, {
      turnSeat: state.turnSeat,
      turnDeadline: Date.now() + 30_000,
      lastActionAt: Date.now(),
    });
    return { ok: true };
  },
});

export const declareMahjong = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat === -1) throw new Error("Not seated");

    const state = await loadState(ctx, roomId);
    if (!state) throw new Error("Game not initialized");
    if (state.finished) throw new Error("Already finished");

    // Server-side validation: total tiles in hand+exposed must equal 14
    const totalTiles =
      state.hands[seat].length +
      state.exposed[seat].reduce((n, s) => n + s.split("-").length, 0);
    if (totalTiles !== 14) {
      throw new Error(`Invalid hand size for mahjong: ${totalTiles}/14`);
    }

    // AUTHORITATIVE NMJL VALIDATION — the hand must match a legal line on
    // the current card, with legal exposures and joker usage. The client
    // never decides the outcome.
    const result = validateWinningHand(
      state.hands[seat],
      state.exposed[seat],
      CURRENT_CARD_YEAR
    );
    if (!result.valid) {
      throw new Error(result.reason ?? "Hand is not a legal NMJL win");
    }
    const awardedPoints = result.points ?? 25;

    state.finished = true;
    state.winnerSeat = seat;

    await persistState(ctx, roomId, seat, userId, state);
    await appendMove(ctx, roomId, seat, userId, "mahjong", {
      hand: state.hands[seat],
      exposed: state.exposed[seat],
      points: awardedPoints,
      patternId: result.patternId,
      patternDescription: result.description,
    });

    // Update room status + game results + ELO (mirrors finishGame)
    await ctx.db.patch(roomId, {
      status: "finished",
      lastActionAt: Date.now(),
      turnDeadline: undefined,
    });

    const startedAt = state.startedAt ?? Date.now();
    const durationMs = Date.now() - startedAt;

    // Single batched profile lookup instead of one query per seat (avoids N+1).
    const seatProfiles = await Promise.all(
      room.seats.map((s) =>
        s.userId
          ? ctx.db
              .query("profiles")
              .withIndex("by_user", (q: any) => q.eq("userId", s.userId))
              .unique()
          : Promise.resolve(null)
      )
    );
    for (let i = 0; i < room.seats.length; i++) {
      const s = room.seats[i];
      if (!s.userId) continue;
      await ctx.db.insert("gameResults", {
        userId: s.userId,
        won: i === seat,
        points: i === seat ? awardedPoints : 0,
        durationMs,
        playedAt: Date.now(),
      });
      const profile = seatProfiles[i];
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

// ── ANTI-CHEAT AUDIT ────────────────────────────────────────────────────
// Reads the move log for a room and returns any integrity violations.

export const auditRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const moves = await ctx.db
      .query("roomMoves")
      .withIndex("by_room_seq", (q) => q.eq("roomId", roomId))
      .collect();
    const violations: { seq: number; reason: string }[] = [];
    let lastSeq = -1;
    let lastSeat = -1;
    for (const m of moves) {
      if (m.seq !== lastSeq + 1) {
        violations.push({ seq: m.seq, reason: `gap in sequence (expected ${lastSeq + 1})` });
      }
      if (m.type === "discard" && m.seat === lastSeat) {
        violations.push({ seq: m.seq, reason: "consecutive discards from same seat" });
      }
      lastSeq = m.seq;
      if (m.type === "discard") lastSeat = m.seat;
    }
    return { totalMoves: moves.length, violations };
  },
});
