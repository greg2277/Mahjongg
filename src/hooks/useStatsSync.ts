// Bridges local userStore stats with Convex backend.
// - Initializes a profile row on first authenticated render.
// - Provides typed helpers to record lesson completes and game results
//   that update both local state (instant UI) and Convex (persistent + leaderboard).

import { useCallback, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@/src/state/userStore';

export function useStatsSync() {
  const { profile, signedIn, completeLesson, recordResult, addXP, updateProfile } = useUser();

  // Pull remote profile (skip when not signed in to avoid Unauthenticated noise)
  const remoteProfile = useQuery(api.queries.myProfile, signedIn ? {} : 'skip') as
    | {
        xp: number;
        level: number;
        currentStreak: number;
        longestStreak: number;
        gamesPlayed: number;
        gamesWon: number;
        lessonsCompleted: number;
        displayName: string;
      }
    | null
    | undefined;

  const remoteBadges = useQuery(api.queries.myBadges, signedIn ? {} : 'skip') as
    | Array<{ badgeId: string; awardedAt: number }>
    | undefined;

  const initProfileMut = useMutation(api.mutations.initProfile);
  const recordGameResultMut = useMutation(api.mutations.recordGameResult);
  const recordLessonMut = useMutation(api.mutations.recordLessonComplete);

  // One-time profile init on sign-in
  useEffect(() => {
    if (!signedIn) return;
    initProfileMut({ displayName: profile.displayName }).catch(() => undefined);
  }, [signedIn, initProfileMut, profile.displayName]);

  // Mirror remote stats into local store when they arrive (server is source of truth)
  useEffect(() => {
    if (!remoteProfile) return;
    updateProfile({
      stats: {
        xp: remoteProfile.xp,
        level: remoteProfile.level,
        streakDays: remoteProfile.currentStreak,
        wins: remoteProfile.gamesWon,
        losses: Math.max(0, remoteProfile.gamesPlayed - remoteProfile.gamesWon),
        lessonsCompleted: remoteProfile.lessonsCompleted,
        badges: (remoteBadges ?? []).map((b) => b.badgeId),
      } as any,
    });
    // We intentionally leave display name local-only here.
  }, [remoteProfile, remoteBadges, updateProfile]);

  const recordGame = useCallback(
    async (won: boolean, points: number, durationMs: number, handPatternId?: string) => {
      // Local first for instant feedback
      recordResult(won);
      addXP(won ? 100 + points : 25);
      if (signedIn) {
        try {
          await recordGameResultMut({ won, points, durationMs, handPatternId });
        } catch {
          // offline / unauth — local stats remain
        }
      }
    },
    [recordResult, addXP, signedIn, recordGameResultMut],
  );

  const recordLesson = useCallback(
    async (lessonId: string, xp = 50) => {
      completeLesson();
      addXP(xp);
      if (signedIn) {
        try {
          await recordLessonMut({ lessonId, xp });
        } catch {
          // offline — local stats remain
        }
      }
    },
    [completeLesson, addXP, signedIn, recordLessonMut],
  );

  return {
    recordGame,
    recordLesson,
    remoteBadges: remoteBadges ?? [],
    isSyncing: signedIn && remoteProfile === undefined,
  };
}
