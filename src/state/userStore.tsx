// Lightweight global user/progress store using React state + AsyncStorage persistence.
// Includes mock email-verification auth flow (Supabase-shaped API for easy swap-in later).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const SESSION_KEY = '@jade-pavilion/session';
const PENDING_KEY = '@jade-pavilion/pending-verification';

export type PendingVerification = {
  email: string;
  displayName: string;
  token: string; // 6-digit mock code
  sentAt: number;
  expiresAt: number;
};

export type AuthResult = { success: true } | { success: false; error: string };

type Ctx = {
  profile: UserProfile;
  signedIn: boolean;
  loading: boolean;
  pendingVerification: PendingVerification | null;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  verifyEmailCode: (code: string) => Promise<AuthResult>;
  resendVerification: () => Promise<AuthResult>;
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
  pendingVerification: null,
  signInWithEmail: noop,
  signUpWithEmail: noop,
  signInWithGoogle: noop,
  verifyEmailCode: noop,
  resendVerification: noop,
  signOut: async () => undefined,
  updateProfile: () => undefined,
  addXP: () => undefined,
  completeLesson: () => undefined,
  recordResult: () => undefined,
});

const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  // Hydrate
  useEffect(() => {
    (async () => {
      try {
        const [rawProfile, rawSession, rawPending] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SESSION_KEY),
          AsyncStorage.getItem(PENDING_KEY),
        ]);
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
        if (rawSession === 'true') setSignedIn(true);
        if (rawPending) {
          try {
            const p = JSON.parse(rawPending) as PendingVerification;
            if (p.expiresAt > Date.now()) setPendingVerification(p);
            else AsyncStorage.removeItem(PENDING_KEY).catch(() => undefined);
          } catch {
            // ignore corrupt pending
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistProfile = useCallback((next: UserProfile) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const persistSession = useCallback((on: boolean) => {
    if (on) AsyncStorage.setItem(SESSION_KEY, 'true').catch(() => undefined);
    else AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
  }, []);

  const persistPending = useCallback((p: PendingVerification | null) => {
    if (p) AsyncStorage.setItem(PENDING_KEY, JSON.stringify(p)).catch(() => undefined);
    else AsyncStorage.removeItem(PENDING_KEY).catch(() => undefined);
  }, []);

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

  // ─────────── AUTH ───────────

  const signUpWithEmail = useCallback<Ctx['signUpWithEmail']>(
    async (email, password, displayName) => {
      const trimmed = email.trim().toLowerCase();
      if (!isValidEmail(trimmed)) return { success: false, error: 'Please enter a valid email address.' };
      if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
      if (displayName.trim().length < 2) return { success: false, error: 'Display name is required.' };

      const code = generateCode();
      const pending: PendingVerification = {
        email: trimmed,
        displayName: displayName.trim(),
        token: code,
        sentAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      setPendingVerification(pending);
      persistPending(pending);
      return { success: true };
    },
    [persistPending],
  );

  const signInWithEmail = useCallback<Ctx['signInWithEmail']>(
    async (email, password) => {
      const trimmed = email.trim().toLowerCase();
      if (!isValidEmail(trimmed)) return { success: false, error: 'Please enter a valid email address.' };
      if (password.length < 8) return { success: false, error: 'Invalid email or password.' };

      // Mock: require email verification on first sign-in
      if (!profile.email || profile.email !== trimmed || !profile.emailVerified) {
        const code = generateCode();
        const pending: PendingVerification = {
          email: trimmed,
          displayName: profile.displayName !== 'Player' ? profile.displayName : trimmed.split('@')[0],
          token: code,
          sentAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };
        setPendingVerification(pending);
        persistPending(pending);
        return { success: true };
      }

      // Verified user — establish session
      setSignedIn(true);
      persistSession(true);
      return { success: true };
    },
    [profile.email, profile.emailVerified, profile.displayName, persistPending, persistSession],
  );

  const signInWithGoogle = useCallback<Ctx['signInWithGoogle']>(async () => {
    // Mock Google OAuth — instantly creates a verified session
    setProfile((p) => {
      const next: UserProfile = {
        ...p,
        displayName: p.displayName !== 'Player' ? p.displayName : 'Jade Player',
        email: p.email || 'player@gmail.com',
        emailVerified: true,
      };
      persistProfile(next);
      return next;
    });
    setSignedIn(true);
    persistSession(true);
    setPendingVerification(null);
    persistPending(null);
    return { success: true };
  }, [persistProfile, persistSession, persistPending]);

  const verifyEmailCode = useCallback<Ctx['verifyEmailCode']>(
    async (code) => {
      if (!pendingVerification) return { success: false, error: 'No verification in progress.' };
      if (pendingVerification.expiresAt < Date.now()) {
        return { success: false, error: 'This code has expired. Please request a new one.' };
      }
      if (code.trim() !== pendingVerification.token) {
        return { success: false, error: 'Incorrect code. Please try again.' };
      }

      const verifiedProfile: UserProfile = {
        ...profile,
        email: pendingVerification.email,
        displayName: pendingVerification.displayName,
        emailVerified: true,
      };
      setProfile(verifiedProfile);
      persistProfile(verifiedProfile);
      setSignedIn(true);
      persistSession(true);
      setPendingVerification(null);
      persistPending(null);
      return { success: true };
    },
    [pendingVerification, profile, persistProfile, persistSession, persistPending],
  );

  const resendVerification = useCallback<Ctx['resendVerification']>(async () => {
    if (!pendingVerification) return { success: false, error: 'No verification in progress.' };
    const refreshed: PendingVerification = {
      ...pendingVerification,
      token: generateCode(),
      sentAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    setPendingVerification(refreshed);
    persistPending(refreshed);
    return { success: true };
  }, [pendingVerification, persistPending]);

  const signOut = useCallback(async () => {
    setSignedIn(false);
    persistSession(false);
    setPendingVerification(null);
    persistPending(null);
  }, [persistSession, persistPending]);

  const value = useMemo<Ctx>(
    () => ({
      profile,
      signedIn,
      loading,
      pendingVerification,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      verifyEmailCode,
      resendVerification,
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
      pendingVerification,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      verifyEmailCode,
      resendVerification,
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
