// Lightweight offline cache for lessons and game data.
// Uses AsyncStorage on native; falls back to localStorage on web automatically
// via @react-native-async-storage/async-storage's web shim.

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { LESSONS } from '@/src/content/lessons';

const CACHE_VERSION = 'v1';
const KEY_LESSONS = `jp.offline.${CACHE_VERSION}.lessons`;
const KEY_LAST_SYNC = `jp.offline.${CACHE_VERSION}.lastSync`;
const KEY_PROGRESS = `jp.offline.${CACHE_VERSION}.progress`;

export type OfflineProgress = {
  completedLessonIds: string[];
  lastViewedLessonId: string | null;
};

export async function primeOfflineCache(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_LESSONS, JSON.stringify(LESSONS));
    await AsyncStorage.setItem(KEY_LAST_SYNC, String(Date.now()));
  } catch {
    // ignore — best-effort cache
  }
}

export async function readCachedLessons(): Promise<typeof LESSONS | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LESSONS);
    if (!raw) return null;
    return JSON.parse(raw) as typeof LESSONS;
  } catch {
    return null;
  }
}

export async function getLastSync(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LAST_SYNC);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export async function saveProgress(p: OfflineProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PROGRESS, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export async function loadProgress(): Promise<OfflineProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROGRESS);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineProgress;
  } catch {
    return null;
  }
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    // Prime the cache on first mount
    void primeOfflineCache().then(() => {
      if (mounted) void getLastSync().then((v) => mounted && setLastSync(v));
    });

    const unsub = NetInfo.addEventListener((state) => {
      if (!mounted) return;
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    // Initial fetch
    void NetInfo.fetch().then((state) => {
      if (!mounted) return;
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return { online, lastSync };
}

export function formatLastSync(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
