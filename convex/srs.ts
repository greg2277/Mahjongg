import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { bumpCounter, dayKey } from "./metrics";

// ─────────────────────────────────────────────────────────────────────────
// Sparrow Rating System (SRS) — Convex backend.
//
// NOTE on engine duplication: the canonical, unit-tested engine lives in
// `src/rating/*`. Convex bundles only the `convex/` directory as the function
// root, and `convex/tsconfig.json` does not include `../src`; reaching into the
// React-Native source tree would couple the deploy bundle to RN modules. So the
// pure math below is a faithful copy of `src/rating` (NGS, pairwise mapping,
// Glicko-2, table-strength multiplier, tiers). It is intentionally identical and
// is validated by the `__tests__/srs.test.ts` suite against `src/rating`.
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_RATING = 1500;
const DEFAULT_RD = 350;
const DEFAULT_SIGMA = 0.06;
const DEFAULT_TAU = 0.5;
const PROVISIONAL_RD = 150;
const SCALE = 173.7178;
const CONVERGENCE = 1e-6;

type G2 = { rating: number; rd: number; sigma: number };
type Match = { opponentRating: number; opponentRd: number; score: number };

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const expectedScore = (mu: number, muJ: number, phiJ: number) =>
  1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

function computeNGS(totals: number[]): number[] {
  if (totals.length === 0) return [];
  const highest = Math.max(...totals);
  const lowest = Math.min(...totals);
  if (highest === lowest) return totals.map(() => 0.5);
  const range = highest - lowest;
  return totals.map((t) => (t - lowest) / range);
}

function pairwiseScore(ngsI: number, ngsJ: number): number {
  return clamp(0.5 + (ngsI - ngsJ) / 2, 0, 1);
}

function tableStrengthMultiplier(rds: number[]): number {
  if (rds.every((rd) => rd < 100)) return 1.15;
  if (rds.some((rd) => rd > 200)) return 0.85;
  return 1.0;
}

function updatePlayer(state: G2, matches: Match[], tau = DEFAULT_TAU): G2 {
  const mu = (state.rating - DEFAULT_RATING) / SCALE;
  const phi = state.rd / SCALE;
  const sigma = state.sigma;

  if (matches.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return { rating: state.rating, rd: phiStar * SCALE, sigma };
  }

  let vInv = 0;
  let deltaSum = 0;
  for (const m of matches) {
    const muJ = (m.opponentRating - DEFAULT_RATING) / SCALE;
    const phiJ = m.opponentRd / SCALE;
    const gJ = g(phiJ);
    const eJ = expectedScore(mu, muJ, phiJ);
    vInv += gJ * gJ * eJ * (1 - eJ);
    deltaSum += gJ * (m.score - eJ);
  }
  const vv = 1 / vInv;
  const delta = vv * deltaSum;

  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - vv - ex);
    const den = 2 * Math.pow(phi * phi + vv + ex, 2);
    return num / den - (x - a) / (tau * tau);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + vv) {
    B = Math.log(delta * delta - phi * phi - vv);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > CONVERGENCE) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }
  const newSigma = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / vv);
  const newMu = mu + newPhi * newPhi * deltaSum;

  return { rating: newMu * SCALE + DEFAULT_RATING, rd: newPhi * SCALE, sigma: newSigma };
}

// MUST stay in sync with src/rating/tiers.ts (engine constants are replicated;
// see the header note). Re-centered for learners: start R1500 lands in Novice
// (tier 2), low tiers are narrow (fast early progress), top tiers widen.
const TIER_MINS: { name: string; min: number }[] = [
  { name: "Beginner", min: -Infinity },
  { name: "Novice", min: 1450 },
  { name: "Apprentice", min: 1550 },
  { name: "Skilled", min: 1650 },
  { name: "Expert", min: 1775 },
  { name: "Master", min: 1925 },
  { name: "Elite", min: 2100 },
  { name: "Grand Master", min: 2300 },
];

export function tierForRating(rating: number): string {
  let name = TIER_MINS[0].name;
  for (const t of TIER_MINS) {
    if (rating >= t.min) name = t.name;
    else break;
  }
  return name;
}

interface SeatUpdate {
  ngs: number;
  before: G2;
  after: G2;
  delta: number;
}

function updateTable(states: G2[], totals: number[]): SeatUpdate[] {
  const n = states.length;
  const ngs = computeNGS(totals);
  const multiplier = tableStrengthMultiplier(states.map((s) => s.rd));
  return states.map((before, i) => {
    const matches: Match[] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      matches.push({
        opponentRating: states[j].rating,
        opponentRd: states[j].rd,
        score: pairwiseScore(ngs[i], ngs[j]),
      });
    }
    const raw = updatePlayer(before, matches);
    const scaledDelta = (raw.rating - before.rating) * multiplier;
    const newRating = Math.round((before.rating + scaledDelta) * 100) / 100;
    return {
      ngs: ngs[i],
      before,
      after: { rating: newRating, rd: Math.round(raw.rd * 100) / 100, sigma: raw.sigma },
      delta: Math.round(scaledDelta * 100) / 100,
    };
  });
}

// ─────────────────────────── Convex functions ───────────────────────────

async function getAuthUser(ctx: any) {
  const u = await authComponent.getAuthUser(ctx);
  if (!u) throw new Error("Unauthenticated");
  return u as any;
}

async function loadRating(ctx: any, userId: string): Promise<G2> {
  const rec = await ctx.db
    .query("ratings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();
  if (!rec) return { rating: DEFAULT_RATING, rd: DEFAULT_RD, sigma: DEFAULT_SIGMA };
  return { rating: rec.R, rd: rec.RD, sigma: rec.sigma };
}

/**
 * Create a rated session. The caller is seat 0 and auto-confirms their entry
 * (counts as the first of the 2-of-4 corroboration). `seats` carries every
 * player's entered final point total; guests have no userId.
 */
export const createRatingSession = mutation({
  args: {
    seats: v.array(
      v.object({
        userId: v.optional(v.string()),
        name: v.string(),
        enteredTotal: v.number(),
      })
    ),
  },
  handler: async (ctx, { seats }) => {
    const user = await getAuthUser(ctx);
    const creatorId = user._id as string;
    if (seats.length < 2 || seats.length > 4) {
      throw new Error("A session needs 2-4 seats");
    }
    // Seat 0 is always the authenticated creator (auto-confirmed = first of the
    // 2-of-4). Remaining seats are co-players/guests as entered by the client.
    const seatRecords = seats.map((s, i) => {
      const userId = i === 0 ? creatorId : s.userId;
      return {
        userId,
        name: s.name,
        enteredTotal: s.enteredTotal,
        confirmed: userId === creatorId,
      };
    });
    const id = await ctx.db.insert("ratingSessions", {
      createdBy: creatorId,
      seats: seatRecords,
      status: "pending",
      createdAt: Date.now(),
    });
    await bumpCounter(ctx, dayKey("ratingSessions"), 1);
    return { sessionId: id };
  },
});

/**
 * A seated player confirms the entered totals. Once >= 2 seats have confirmed,
 * the session is corroborated and the Glicko-2 update runs immediately.
 */
export const confirmSessionTotals = mutation({
  args: { sessionId: v.id("ratingSessions") },
  handler: async (ctx, { sessionId }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.status === "rated") return { status: "rated" as const, alreadyRated: true };

    const seatIdx = session.seats.findIndex((s) => s.userId === userId);
    if (seatIdx === -1) throw new Error("You are not seated in this session");

    const seats = session.seats.map((s, i) =>
      i === seatIdx ? { ...s, confirmed: true } : s
    );
    const confirmedCount = seats.filter((s) => s.confirmed).length;

    if (confirmedCount < 2) {
      await ctx.db.patch(sessionId, { seats });
      return { status: "pending" as const, confirmedCount };
    }

    // Corroborated → run the rating update.
    await ctx.db.patch(sessionId, { seats, status: "corroborated" });
    const result = await rateCorroboratedSession(ctx, sessionId);
    return { status: "rated" as const, confirmedCount, results: result };
  },
});

/**
 * In-person corroboration: the session creator (host of a shared device at the
 * table) records another seat's confirmation. Enforces that the confirmed seat
 * is distinct from already-confirmed seats. When >= 2 seats are confirmed the
 * Glicko-2 update runs immediately.
 */
export const confirmSeat = mutation({
  args: { sessionId: v.id("ratingSessions"), seatIndex: v.number() },
  handler: async (ctx, { sessionId, seatIndex }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as string;
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.status === "rated") return { status: "rated" as const, alreadyRated: true };
    if (session.createdBy !== userId) {
      throw new Error("Only the session host can record in-person confirmations");
    }
    if (seatIndex < 0 || seatIndex >= session.seats.length) {
      throw new Error("Invalid seat");
    }
    const seats = session.seats.map((s, i) =>
      i === seatIndex ? { ...s, confirmed: true } : s
    );
    const confirmedCount = seats.filter((s) => s.confirmed).length;
    if (confirmedCount < 2) {
      await ctx.db.patch(sessionId, { seats });
      return { status: "pending" as const, confirmedCount };
    }
    await ctx.db.patch(sessionId, { seats, status: "corroborated" });
    const results = await rateCorroboratedSession(ctx, sessionId);
    return { status: "rated" as const, confirmedCount, results };
  },
});

// Compute NGS + Glicko-2 for all seats and persist new ratings + history.
async function rateCorroboratedSession(ctx: any, sessionId: Id<"ratingSessions">) {
  const session = await ctx.db.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status === "rated") return session.results ?? [];

  const totals = session.seats.map((s: any) => s.enteredTotal);
  const states: G2[] = [];
  for (const seat of session.seats) {
    states.push(seat.userId ? await loadRating(ctx, seat.userId) : {
      rating: DEFAULT_RATING,
      rd: DEFAULT_RD,
      sigma: DEFAULT_SIGMA,
    });
  }

  const updates = updateTable(states, totals);
  const now = Date.now();
  const results = [];

  for (let i = 0; i < session.seats.length; i++) {
    const seat = session.seats[i];
    const u = updates[i];
    const tier = tierForRating(u.after.rating);
    results.push({
      userId: seat.userId,
      name: seat.name,
      ngs: u.ngs,
      beforeR: Math.round(u.before.rating * 100) / 100,
      afterR: u.after.rating,
      delta: u.delta,
      tier,
    });

    // Only persist ratings for real (non-guest) seats.
    if (!seat.userId) continue;
    const provisional = u.after.rd >= PROVISIONAL_RD;
    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_user", (q: any) => q.eq("userId", seat.userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        R: u.after.rating,
        RD: u.after.rd,
        sigma: u.after.sigma,
        gamesPlayed: existing.gamesPlayed + 1,
        provisional,
        tier,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("ratings", {
        userId: seat.userId,
        R: u.after.rating,
        RD: u.after.rd,
        sigma: u.after.sigma,
        gamesPlayed: 1,
        provisional,
        tier,
        updatedAt: now,
      });
    }
    await ctx.db.insert("ratingHistory", {
      userId: seat.userId,
      R: u.after.rating,
      RD: u.after.rd,
      tier,
      timestamp: now,
      sessionId,
    });
  }

  await ctx.db.patch(sessionId, { status: "rated", ratedAt: now, results });
  return results;
}

/**
 * Read a user's current SRS standing for matchmaking. Returns the default
 * unrated profile (R1500/RD350, provisional) when the player has no `ratings`
 * row yet, so callers never have to special-case new players. Shared by
 * `multiplayer.ts` to pair players by skill and to badge opponents by tier.
 */
export async function srsSnapshot(
  ctx: any,
  userId: string
): Promise<{ rating: number; rd: number; tier: string; provisional: boolean; hasRating: boolean }> {
  const rec = await ctx.db
    .query("ratings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();
  const R = rec?.R ?? DEFAULT_RATING;
  const RD = rec?.RD ?? DEFAULT_RD;
  return {
    rating: R,
    rd: RD,
    tier: rec?.tier ?? tierForRating(R),
    provisional: rec ? rec.provisional : RD >= PROVISIONAL_RD,
    hasRating: !!rec,
  };
}

/** Current rating + history for the signed-in player. */
export const getMyRating = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx).catch(() => null);
    if (!user) return null;
    const userId = (user as any)._id as string;
    const rec = await ctx.db
      .query("ratings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const history = await ctx.db
      .query("ratingHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    const R = rec?.R ?? DEFAULT_RATING;
    const RD = rec?.RD ?? DEFAULT_RD;
    return {
      hasRating: !!rec,
      R,
      RD,
      sigma: rec?.sigma ?? DEFAULT_SIGMA,
      gamesPlayed: rec?.gamesPlayed ?? 0,
      provisional: rec ? rec.provisional : true,
      tier: rec?.tier ?? tierForRating(R),
      history: history
        .map((h) => ({ R: h.R, RD: h.RD, tier: h.tier, timestamp: h.timestamp }))
        .reverse(), // chronological for a sparkline
    };
  },
});

/** Pending/corroborated sessions the signed-in player is seated in. */
export const getMySessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx).catch(() => null);
    if (!user) return [];
    const userId = (user as any)._id as string;
    const pending = await ctx.db
      .query("ratingSessions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(50);
    return pending
      .filter((s) => s.seats.some((seat) => seat.userId === userId))
      .map((s) => ({
        _id: s._id,
        createdAt: s.createdAt,
        confirmedCount: s.seats.filter((seat) => seat.confirmed).length,
        mySeatConfirmed: s.seats.find((seat) => seat.userId === userId)?.confirmed ?? false,
        seats: s.seats.map((seat) => ({
          name: seat.name,
          enteredTotal: seat.enteredTotal,
          confirmed: seat.confirmed,
          isMe: seat.userId === userId,
        })),
      }));
  },
});

/** Full detail for one session (confirm screen). */
export const getSession = query({
  args: { sessionId: v.id("ratingSessions") },
  handler: async (ctx, { sessionId }) => {
    const user = await getAuthUser(ctx).catch(() => null);
    const userId = user ? ((user as any)._id as string) : null;
    const s = await ctx.db.get(sessionId);
    if (!s) return null;
    return {
      _id: s._id,
      status: s.status,
      createdAt: s.createdAt,
      isHost: s.createdBy === userId,
      confirmedCount: s.seats.filter((seat) => seat.confirmed).length,
      seats: s.seats.map((seat, i) => ({
        index: i,
        name: seat.name,
        enteredTotal: seat.enteredTotal,
        confirmed: seat.confirmed,
        isMe: seat.userId === userId,
      })),
      results: s.results ?? null,
    };
  },
});

/** Top players by rating among non-provisional accounts. */
export const getLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const top = await ctx.db
      .query("ratings")
      .withIndex("by_rating")
      .order("desc")
      .take((limit ?? 50) * 3); // over-fetch, then drop provisional
    const rated = top.filter((r) => !r.provisional).slice(0, limit ?? 50);
    return rated.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      R: Math.round(r.R),
      tier: r.tier,
      gamesPlayed: r.gamesPlayed,
    }));
  },
});
