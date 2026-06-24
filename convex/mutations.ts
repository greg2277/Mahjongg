import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

async function getAuthUser(ctx: any) {
  const userMetadata = await authComponent.getAuthUser(ctx);
  if (!userMetadata) throw new Error("Unauthenticated");
  return userMetadata as any;
}

const XP_PER_LEVEL = 500;

function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + "T00:00:00Z").getTime();
  const d2 = new Date(b + "T00:00:00Z").getTime();
  return Math.round((d2 - d1) / 86_400_000);
}

async function ensureProfile(ctx: any, userId: string, displayName: string) {
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("profiles", {
    userId,
    displayName,
    avatarSeed: displayName,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: todayIso(),
    gamesPlayed: 0,
    gamesWon: 0,
    lessonsCompleted: 0,
    createdAt: now,
    updatedAt: now,
  });
  return await ctx.db.get(id);
}

export const initProfile = mutation({
  args: { displayName: v.optional(v.string()) },
  handler: async (ctx, { displayName }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as unknown as string;
    const name = displayName ?? user.name ?? user.email ?? "Player";
    return await ensureProfile(ctx, userId, name);
  },
});

async function bumpStreak(ctx: any, profile: any) {
  const today = todayIso();
  if (profile.lastActiveDate === today) return profile;
  const gap = daysBetween(profile.lastActiveDate, today);
  const newStreak = gap === 1 ? profile.currentStreak + 1 : 1;
  const longest = Math.max(profile.longestStreak, newStreak);
  await ctx.db.patch(profile._id, {
    currentStreak: newStreak,
    longestStreak: longest,
    lastActiveDate: today,
    updatedAt: Date.now(),
  });
  return { ...profile, currentStreak: newStreak, longestStreak: longest, lastActiveDate: today };
}

async function awardBadge(ctx: any, userId: string, badgeId: string) {
  const exists = await ctx.db
    .query("badges")
    .withIndex("by_user_badge", (q: any) => q.eq("userId", userId).eq("badgeId", badgeId))
    .unique();
  if (exists) return;
  await ctx.db.insert("badges", { userId, badgeId, awardedAt: Date.now() });
}

export const recordGameResult = mutation({
  args: {
    won: v.boolean(),
    points: v.number(),
    durationMs: v.number(),
    handPatternId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as unknown as string;
    let profile = await ensureProfile(ctx, userId, user.name ?? user.email ?? "Player");
    profile = await bumpStreak(ctx, profile);

    await ctx.db.insert("gameResults", {
      userId,
      won: args.won,
      points: args.points,
      durationMs: args.durationMs,
      handPatternId: args.handPatternId,
      playedAt: Date.now(),
    });

    const xpGain = args.won ? 100 + args.points : 25;
    const newXp = profile.xp + xpGain;
    const newLevel = levelFromXp(newXp);
    const newGamesPlayed = profile.gamesPlayed + 1;
    const newGamesWon = profile.gamesWon + (args.won ? 1 : 0);

    await ctx.db.patch(profile._id, {
      xp: newXp,
      level: newLevel,
      gamesPlayed: newGamesPlayed,
      gamesWon: newGamesWon,
      updatedAt: Date.now(),
    });

    if (args.won && newGamesWon === 1) await awardBadge(ctx, userId, "first_win");
    if (newGamesWon >= 10) await awardBadge(ctx, userId, "veteran_10");
    if (profile.currentStreak >= 7) await awardBadge(ctx, userId, "streak_7");
    if (newLevel > profile.level) await awardBadge(ctx, userId, `level_${newLevel}`);

    return { xpGained: xpGain, newXp, newLevel, leveledUp: newLevel > profile.level };
  },
});

export const recordLessonComplete = mutation({
  args: { lessonId: v.string(), xp: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as unknown as string;
    let profile = await ensureProfile(ctx, userId, user.name ?? user.email ?? "Player");
    profile = await bumpStreak(ctx, profile);

    const xpGain = args.xp ?? 50;
    const newXp = profile.xp + xpGain;
    const newLevel = levelFromXp(newXp);
    const newCount = profile.lessonsCompleted + 1;

    await ctx.db.patch(profile._id, {
      xp: newXp,
      level: newLevel,
      lessonsCompleted: newCount,
      updatedAt: Date.now(),
    });

    if (newCount === 1) await awardBadge(ctx, userId, "first_lesson");
    if (newCount >= 10) await awardBadge(ctx, userId, "scholar_10");

    return { xpGained: xpGain, newXp, newLevel };
  },
});

export const updateDisplayName = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, { displayName }) => {
    const user = await getAuthUser(ctx);
    const userId = user._id as unknown as string;
    const profile = await ensureProfile(ctx, userId, displayName);
    await ctx.db.patch(profile._id, { displayName, updatedAt: Date.now() });
    return { ok: true };
  },
});
