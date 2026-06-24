import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useUser } from '@/src/state/userStore';
import { useRouter } from 'expo-router';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import { LogoMark } from '@/src/components/Logo';
import { useStatsSync } from '@/src/hooks/useStatsSync';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSession } from '../../lib/auth-client';

export default function ProfileScreen() {
  const { theme, mode, preference, setPreference } = useTheme();
  const { profile } = useUser();
  const router = useRouter();
  const { remoteBadges } = useStatsSync();
  const { data: session } = useSession();
  const replays = useQuery(api.social.listMyReplays, session ? {} : 'skip');
  const winRate =
    profile.stats.wins + profile.stats.losses === 0
      ? 0
      : (profile.stats.wins / (profile.stats.wins + profile.stats.losses)) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Profile header */}
        <Card variant="elevated" padding={0} style={{ overflow: 'hidden' }}>
          <LinearGradient
            colors={theme.gradientHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18, alignItems: 'center' }}
          >
            <LogoMark size={64} />
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 12 }}>
              {profile.displayName}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
              Level {profile.stats.level} • {profile.stats.xp.toLocaleString()} XP
            </Text>
          </LinearGradient>
          <View
            style={{
              flexDirection: 'row',
              padding: 16,
              gap: 8,
            }}
          >
            <Stat label="Wins" value={String(profile.stats.wins)} />
            <Stat label="Win rate" value={`${winRate.toFixed(0)}%`} />
            <Stat
              label="Accuracy"
              value={`${(profile.stats.accuracy * 100).toFixed(0)}%`}
            />
            <Stat label="Streak" value={`${profile.stats.streakDays}d`} />
          </View>
        </Card>

        {/* Badges */}
        <Text
          style={{
            color: theme.text,
            fontSize: 16,
            fontWeight: '800',
            marginTop: 22,
            marginBottom: 10,
          }}
        >
          Badges
        </Text>
        <Card variant="elevated">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { id: 'first_lesson', label: 'First Lesson', icon: 'leaf' as const, tone: theme.primary },
              { id: 'first_win', label: 'First Win', icon: 'trophy' as const, tone: theme.gold },
              { id: 'streak_7', label: '7-Day Streak', icon: 'flame' as const, tone: theme.accent },
              { id: 'veteran_10', label: 'Veteran (10 wins)', icon: 'medal' as const, tone: theme.primary },
              { id: 'scholar_10', label: 'Scholar (10 lessons)', icon: 'school' as const, tone: theme.accent },
              { id: 'level_5', label: 'Level 5', icon: 'star' as const, tone: theme.gold },
            ].map((b) => {
              const earnedRemote = remoteBadges.some((rb) => rb.badgeId === b.id);
              const earnedLocal = profile.stats.badges.includes(b.id);
              const earned = earnedRemote || earnedLocal;
              return (
              <View key={b.id} style={{ width: '30%', alignItems: 'center' }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: b.tone + (earned ? '22' : '14'),
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: earned ? 1 : 0.4,
                  }}
                >
                  <Ionicons name={b.icon} size={24} color={b.tone} />
                </View>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 12,
                    fontWeight: '700',
                    marginTop: 6,
                    textAlign: 'center',
                  }}
                >
                  {b.label}
                </Text>
                {!earned ? (
                  <Text style={{ color: theme.textSubtle, fontSize: 10, marginTop: 2 }}>
                    Locked
                  </Text>
                ) : null}
              </View>
              );
            })}
          </View>
        </Card>

        {/* Settings */}
        <Text
          style={{
            color: theme.text,
            fontSize: 16,
            fontWeight: '800',
            marginTop: 22,
            marginBottom: 10,
          }}
        >
          Appearance
        </Text>
        <Card variant="elevated" padding={4}>
          {(['system', 'light', 'dark'] as const).map((p, i) => (
            <Pressable
              key={p}
              onPress={() => setPreference(p)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: theme.border,
              }}
            >
              <Ionicons
                name={p === 'system' ? 'phone-portrait' : p === 'light' ? 'sunny' : 'moon'}
                size={18}
                color={theme.textMuted}
              />
              <Text
                style={{
                  flex: 1,
                  color: theme.text,
                  fontWeight: '600',
                  marginLeft: 12,
                  fontSize: 14,
                  textTransform: 'capitalize',
                }}
              >
                {p}
              </Text>
              {preference === p ? (
                <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              ) : null}
            </Pressable>
          ))}
        </Card>

        <Text
          style={{
            color: theme.text,
            fontSize: 16,
            fontWeight: '800',
            marginTop: 22,
            marginBottom: 10,
          }}
        >
          Recent replays
        </Text>
        <Card variant="elevated" padding={4}>
          {!replays || replays.length === 0 ? (
            <View style={{ padding: 14 }}>
              <Text style={{ color: theme.textSubtle, fontSize: 13 }}>
                Finished games will appear here so you can rewatch them.
              </Text>
            </View>
          ) : (
            replays.map((r, i) => (
              <Pressable
                key={r._id as string}
                onPress={() => router.push(`/replay/${r._id}` as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.border,
                  gap: 12,
                }}
              >
                <View style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: theme.gold + '22',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="film" size={16} color={theme.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                    Table {r.code}
                  </Text>
                  <Text style={{ color: theme.textSubtle, fontSize: 11 }}>
                    {r.mode.toUpperCase()} · seat {r.seats[r.mySeat]?.wind ?? '?'} · {new Date(r.finishedAt).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
              </Pressable>
            ))
          )}
        </Card>

        <Text
          style={{
            color: theme.text,
            fontSize: 16,
            fontWeight: '800',
            marginTop: 22,
            marginBottom: 10,
          }}
        >
          Account
        </Text>
        <Card variant="elevated" padding={4}>
          {[
            { icon: 'mail' as const, label: 'Email', value: profile.email || 'Not set' },
            { icon: 'shield-checkmark' as const, label: 'Verified', value: profile.emailVerified ? 'Yes' : 'Pending' },
            { icon: 'card' as const, label: 'NMJL Card', value: 'Default 2025' },
            { icon: 'help-circle' as const, label: 'Help & Rules', value: '' },
          ].map((row, i) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: theme.border,
              }}
            >
              <Ionicons name={row.icon} size={18} color={theme.textMuted} />
              <Text
                style={{ flex: 1, color: theme.text, fontWeight: '600', marginLeft: 12, fontSize: 14 }}
              >
                {row.label}
              </Text>
              <Text style={{ color: theme.textSubtle, fontSize: 13 }}>{row.value}</Text>
            </View>
          ))}
        </Card>

        <Text
          style={{
            color: theme.textSubtle,
            fontSize: 11,
            marginTop: 20,
            textAlign: 'center',
          }}
        >
          Theme: {mode} • v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surfaceAlt,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: theme.textSubtle, fontSize: 10, marginTop: 2, fontWeight: '600' }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
