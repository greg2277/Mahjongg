import { query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

async function getAuthUser(ctx: any) {
  const userMetadata = await authComponent.getAuthUser(ctx);
  if (!userMetadata) throw new Error("Unauthenticated");
  return userMetadata as any;
}

export const myProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx).catch(() => null);
    if (!user) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id as unknown as string))
      .unique();
    return profile;
  },
});

export const myBadges = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx).catch(() => null);
    if (!user) return [];
    return await ctx.db
      .query("badges")
      .withIndex("by_user", (q) => q.eq("userId", user._id as unknown as string))
      .collect();
  },
});

export const myRecentGames = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await getAuthUser(ctx).catch(() => null);
    if (!user) return [];
    const rows = await ctx.db
      .query("gameResults")
      .withIndex("by_user", (q) => q.eq("userId", user._id as unknown as string))
      .order("desc")
      .take(limit ?? 20);
    return rows;
  },
});

export const globalLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const top = await ctx.db
      .query("profiles")
      .withIndex("by_xp")
      .order("desc")
      .take(limit ?? 50);
    return top.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      displayName: p.displayName,
      avatarSeed: p.avatarSeed ?? p.displayName,
      xp: p.xp,
      level: p.level,
      currentStreak: p.currentStreak,
      gamesWon: p.gamesWon,
    }));
  },
});
