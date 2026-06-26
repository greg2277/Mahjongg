import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useUser } from '@/src/state/userStore';
import { useSession } from '@/lib/auth-client';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';

const FALLBACK_ROWS = [
  { rank: 1, displayName: 'Imperial Crane', xp: 18420, level: 12, currentStreak: 28, gamesWon: 64, country: '🇺🇸' },
  { rank: 2, displayName: 'Lotus Player', xp: 16310, level: 11, currentStreak: 14, gamesWon: 51, country: '🇨🇦' },
  { rank: 3, displayName: 'Bamboo Sage', xp: 15990, level: 11, currentStreak: 9, gamesWon: 47, country: '🇺🇸' },
  { rank: 4, displayName: 'Jade Empress', xp: 14760, level: 10, currentStreak: 22, gamesWon: 44, country: '🇬🇧' },
  { rank: 5, displayName: 'Crak Master', xp: 13980, level: 10, currentStreak: 5, gamesWon: 39, country: '🇺🇸' },
  { rank: 6, displayName: 'Dot King', xp: 13200, level: 9, currentStreak: 11, gamesWon: 36, country: '🇦🇺' },
  { rank: 7, displayName: 'Charleston Pro', xp: 12450, level: 9, currentStreak: 3, gamesWon: 33, country: '🇺🇸' },
  { rank: 8, displayName: 'Joker Wild', xp: 11900, level: 8, currentStreak: 7, gamesWon: 29, country: '🇺🇸' },
];

type Row = {
  rank: number;
  displayName: string;
  xp: number;
  level: number;
  currentStreak: number;
  gamesWon: number;
  isYou?: boolean;
  country?: string;
};

export default function LeaderboardScreen() {
  const { theme } = useTheme();
  const { profile } = useUser();
  const router = useRouter();
  const { data: session } = useSession();
  const myRating = useQuery(api.srs.getMyRating, session ? {} : 'skip');
  const [tab, setTab] = useState<'global' | 'friends'>('global');

  // Live global rankings from Convex (falls back gracefully when unavailable)
  const remote = useQuery(api.queries.globalLeaderboard, { limit: 50 }) as
    | Array<{
        rank: number;
        displayName: string;
        xp: number;
        level: number;
        currentStreak: number;
        gamesWon: number;
        userId: string;
      }>
    | undefined;
  const isLoading = remote === undefined;

  const rows: Row[] = useMemo(() => {
    const youRow: Row = {
      rank: 0,
      displayName: profile.displayName,
      xp: profile.stats.xp,
      level: profile.stats.level,
      currentStreak: profile.stats.streakDays,
      gamesWon: profile.stats.wins,
      isYou: true,
    };
    const base: Row[] =
      remote && remote.length > 0
        ? remote.map((r) => ({
            rank: r.rank,
            displayName: r.displayName,
            xp: r.xp,
            level: r.level,
            currentStreak: r.currentStreak,
            gamesWon: r.gamesWon,
          }))
        : FALLBACK_ROWS;

    // Inject "you" if not already in the leaderboard
    const alreadyIn = base.some(
      (r) => r.displayName.toLowerCase() === profile.displayName.toLowerCase(),
    );
    const merged = alreadyIn
      ? base.map((r) =>
          r.displayName.toLowerCase() === profile.displayName.toLowerCase()
            ? { ...r, isYou: true }
            : r,
        )
      : [...base, youRow];

    // Sort + recompute ranks
    return merged
      .sort((a, b) => b.xp - a.xp)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [remote, profile]);

  const friendRows: Row[] = useMemo(() => {
    const friendNames = ['Imperial Crane', 'Lotus Player', 'Charleston Pro', 'Bamboo Sage'];
    const subset = rows.filter((r) => r.isYou || friendNames.includes(r.displayName));
    return subset
      .sort((a, b) => b.xp - a.xp)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [rows]);

  const visibleRows = tab === 'global' ? rows.slice(0, 50) : friendRows;
  const yourRank = rows.find((r) => r.isYou)?.rank ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
          Leaderboard
        </Text>
        <Text style={{ color: theme.textSubtle, fontSize: 14, marginTop: 4 }}>
          Climb the ranks — every game and lesson counts.
        </Text>

        {/* Sparrow Rating System entry point */}
        <Pressable onPress={() => router.push('/rating' as any)}>
          <Card variant="elevated" padding={14} style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.gold + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="stats-chart" size={20} color={theme.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>
                  SPARROW RATING
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18 }}>
                    {myRating ? Math.round(myRating.R) : '—'}
                  </Text>
                  {myRating ? (
                    <Badge label={myRating.tier} tone="gold" />
                  ) : (
                    <Text style={{ color: theme.textSubtle, fontSize: 12 }}>Tap to start</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
            </View>
          </Card>
        </Pressable>

        {/* Your rank banner */}
        {yourRank !== null ? (
          <Card variant="elevated" padding={14} style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.primary + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 14 }}>
                  #{yourRank}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>
                  YOUR RANK
                </Text>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, marginTop: 2 }}>
                  {profile.displayName} • Lv {profile.stats.level}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>
                  {profile.stats.xp.toLocaleString()}
                </Text>
                <Text style={{ color: theme.textSubtle, fontSize: 11, marginTop: 2 }}>XP</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Tabs */}
        <View
          style={{
            marginTop: 16,
            flexDirection: 'row',
            backgroundColor: theme.surfaceAlt,
            borderRadius: 12,
            padding: 4,
          }}
        >
          {(['global', 'friends'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 9,
                backgroundColor: tab === t ? theme.surface : 'transparent',
              }}
            >
              <Text
                style={{
                  color: tab === t ? theme.text : theme.textSubtle,
                  fontWeight: '700',
                  fontSize: 13,
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <Card variant="elevated" padding={0} style={{ marginTop: 16, overflow: 'hidden' }}>
            {visibleRows.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: theme.textSubtle, fontSize: 13 }}>
                  No friends yet. Invite players to compete!
                </Text>
              </View>
            ) : (
              visibleRows.map((r, i) => (
                <View
                  key={`${r.displayName}-${r.rank}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: theme.border,
                    backgroundColor: r.isYou ? theme.primary + '10' : 'transparent',
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor:
                        r.rank === 1
                          ? '#FEF3C7'
                          : r.rank === 2
                          ? '#E5E7EB'
                          : r.rank === 3
                          ? '#FCD9B6'
                          : theme.surfaceAlt,
                    }}
                  >
                    {r.rank <= 3 ? (
                      <Ionicons
                        name="trophy"
                        size={16}
                        color={r.rank === 1 ? '#B45309' : r.rank === 2 ? '#6B7872' : '#92400E'}
                      />
                    ) : (
                      <Text style={{ color: theme.textSubtle, fontWeight: '800', fontSize: 12 }}>
                        {r.rank}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: '700',
                          fontSize: 14,
                        }}
                        numberOfLines={1}
                      >
                        {r.country ? `${r.country} ` : ''}
                        {r.displayName}
                      </Text>
                      {r.isYou ? (
                        <View
                          style={{
                            backgroundColor: theme.primary,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>YOU</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: theme.textSubtle, fontSize: 11, marginTop: 2 }}>
                      Lv {r.level} • {r.gamesWon} wins • {r.currentStreak}d streak
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 13 }}>
                      {r.xp.toLocaleString()}
                    </Text>
                    <Text style={{ color: theme.textSubtle, fontSize: 10, marginTop: 1 }}>XP</Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        )}

        <Text
          style={{
            color: theme.textSubtle,
            fontSize: 11,
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          Rankings update in real time as players earn XP.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
