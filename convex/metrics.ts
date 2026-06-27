import { query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────
// Lightweight load / cost monitoring.
//
// All aggregate usage numbers are served from the `appMetrics` counter table:
// each datapoint is a single keyed row read via the `by_key` index (O(1)), so
// nothing here scans a large table. Cumulative counters use a bare key
// (e.g. "registeredUsers"); per-day counters are namespaced with the ISO date
// (e.g. "sessions:2026-06-26"). Existing mutations bump these additively via
// `bumpCounter` so the write path keeps working unchanged if a counter is
// missing — reads simply treat an absent counter as 0.
// ─────────────────────────────────────────────────────────────────────────

export function isoDate(ts: number = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

// Daily-namespaced keys.
export const dayKey = (name: string, ts: number = Date.now()) =>
  `${name}:${isoDate(ts)}`;

// Additively bump a named counter by `delta` (default +1), creating the row on
// first use. Safe to call from any mutation; never throws on a missing row.
export async function bumpCounter(ctx: any, key: string, delta = 1): Promise<void> {
  const row = await ctx.db
    .query("appMetrics")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique();
  if (row) {
    await ctx.db.patch(row._id, { value: row.value + delta, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("appMetrics", { key, value: delta, updatedAt: Date.now() });
  }
}

// Read a single counter by key; missing → 0.
async function readCounter(ctx: any, key: string): Promise<number> {
  const row = await ctx.db
    .query("appMetrics")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique();
  return row?.value ?? 0;
}

/**
 * Aggregate usage summary for an external cost/load dashboard.
 *
 * Cheap by construction: four single-row index lookups against `appMetrics`,
 * no table scans. Counters are maintained additively by the mutations that
 * create the underlying records:
 *  - registeredUsers     ← incremented when a player profile is first created
 *  - activeRooms         ← +1 on room create, -1 when a room finishes/abandons
 *  - sessions:<date>      ← incremented when a multiplayer game starts
 *  - ratingSessions:<date>← incremented when a rating session is created
 */
export const getUsageSummary = query({
  args: {},
  handler: async (ctx) => {
    const today = isoDate();
    const [registeredUsers, activeRooms, sessionsToday, ratingSessionsToday] =
      await Promise.all([
        readCounter(ctx, "registeredUsers"),
        readCounter(ctx, "activeRooms"),
        readCounter(ctx, dayKey("sessions")),
        readCounter(ctx, dayKey("ratingSessions")),
      ]);
    return {
      registeredUsers,
      activeRooms: Math.max(0, activeRooms),
      sessionsToday,
      ratingSessionsToday,
      date: today,
      generatedAt: Date.now(),
    };
  },
});
