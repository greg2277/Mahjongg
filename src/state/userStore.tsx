// Lightweight global progress store using React state + AsyncStorage persistence.
// Authentication is owned entirely by Better-Auth (see lib/auth-client + convex/auth.ts);
// this store only mirrors the signed-in identity and keeps local gameplay progress.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useSession,
  signInWithEmail as authSignInWithEmail,
  signUpWithEmail as authSignUpWithEmail,
  signInWithGoogle as authSignInWithGoogle,
  signOutUser,
} from '@/lib/auth-client';

export type UserStats = {
  xp: number;
  level: number;
  streakDays: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  accuracy: number;
  wins: number;
  losses: number;
  badges: string[];
};

export type UserProfile = {
  displayName: string;
  email: string;
  emailVerified: boolean;
  avatarSeed: string;
  joinedAt: string;
  stats: UserStats;
};

const DEFAULT_STATS: UserStats = {
  xp: 1240,
  level: 4,
  streakDays: 6,
  lessonsCompleted: 8,
  lessonsTotal: 24,
  accuracy: 0.82,
  wins: 14,
  losses: 9,
  badges: ['first-charleston', 'card-reader-i', 'streak-5'],
};

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Player',
  email: '',
  emailVerified: false,
  avatarSeed: 'jade',
  joinedAt: new Date().toISOString(),
  stats: DEFAULT_STATS,
};

const STORAGE_KEY = '@jade-pavilion/profile';

export type AuthResult = { success: true } | { success: false; error: string };

type Ctx = {
  profile: UserProfile;
  signedIn: boolean;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => void;
  addXP: (amount: number) => void;
  completeLesson: () => void;
  recordResult: (won: boolean) => void;
};

const noop = async () => ({ success: false as const, error: 'not-ready' });

const UserContext = createContext<Ctx>({
  profile: DEFAULT_PROFILE,
  signedIn: false,
  loading: true,
  signInWithEmail: noop,
  signUpWithEmail: noop,
  signInWithGoogle: noop,
  signOut: async () => undefined,
  updateProfile: () => undefined,
  addXP: () => undefined,
  completeLesson: () => undefined,
  recordResult: () => undefined,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  const signedIn = !!session;
  const loading = isPending || !hydrated;

  // Hydrate local progress
  useEffect(() => {
    (async () => {
      try {
        const rawProfile = await AsyncStorage.getItem(STORAGE_KEY);
        if (rawProfile) {
          try {
            const parsed = JSON.parse(rawProfile) as UserProfile;
            setProfile({
              ...DEFAULT_PROFILE,
              ...parsed,
              stats: { ...DEFAULT_STATS, ...parsed.stats },
            });
          } catch {
            // ignore corrupt profile
          }
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const persistProfile = useCallback((next: UserProfile) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  // Mirror the authoritative Better-Auth identity into the local profile.
  useEffect(() => {
    const user = session?.user as
      | { email?: string; name?: string; emailVerified?: boolean }
      | undefined;
    if (!user) return;
    setProfile((p) => {
      const next: UserProfile = {
        ...p,
        email: user.email ?? p.email,
        displayName: user.name && user.name.length > 0 ? user.name : p.displayName,
        emailVerified: !!user.emailVerified,
      };
      persistProfile(next);
      return next;
    });
  }, [session, persistProfile]);

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      setProfile((p) => {
        const next = { ...p, ...patch, stats: { ...p.stats, ...(patch.stats ?? {}) } };
        persistProfile(next);
        return next;
      });
    },
    [persistProfile],
  );

  const addXP = useCallback(
    (amount: number) => {
      setProfile((p) => {
        const xp = p.stats.xp + amount;
        const level = Math.max(1, Math.floor(xp / 300) + 1);
        const next = { ...p, stats: { ...p.stats, xp, level } };
        persistProfile(next);
        return next;
      });
    },
    [persistProfile],
  );

  const completeLesson = useCallback(() => {
    setProfile((p) => {
      const lessonsCompleted = Math.min(p.stats.lessonsTotal, p.stats.lessonsCompleted + 1);
      const next = { ...p, stats: { ...p.stats, lessonsCompleted } };
      persistProfile(next);
      return next;
    });
  }, [persistProfile]);

  const recordResult = useCallback(
    (won: boolean) => {
      setProfile((p) => {
        const wins = p.stats.wins + (won ? 1 : 0);
        const losses = p.stats.losses + (won ? 0 : 1);
        const next = { ...p, stats: { ...p.stats, wins, losses } };
        persistProfile(next);
        return next;
      });
    },
    [persistProfile],
  );

  // ─────────── AUTH (delegated to Better-Auth) ───────────

  const signUpWithEmail = useCallback<Ctx['signUpWithEmail']>(
    async (email, password, displayName) => {
      const res = await authSignUpWithEmail(email.trim(), password, displayName.trim());
      if (res.success) return { success: true };
      return { success: false, error: res.error?.message ?? 'Sign-up failed' };
    },
    [],
  );

  const signInWithEmail = useCallback<Ctx['signInWithEmail']>(async (email, password) => {
    const res = await authSignInWithEmail(email.trim(), password);
    if (res.success) return { success: true };
    return { success: false, error: res.error?.message ?? 'Sign-in failed' };
  }, []);

  const signInWithGoogle = useCallback<Ctx['signInWithGoogle']>(async () => {
    const res = await authSignInWithGoogle();
    if (res.success) return { success: true };
    return { success: false, error: res.error?.message ?? 'Google sign-in failed' };
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      profile,
      signedIn,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      updateProfile,
      addXP,
      completeLesson,
      recordResult,
    }),
    [
      profile,
      signedIn,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      updateProfile,
      addXP,
      completeLesson,
      recordResult,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
