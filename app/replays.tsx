import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useTheme } from '../src/theme/ThemeProvider';
import { Card } from '../src/components/Card';
import { Badge } from '../src/components/Badge';
import { useSession } from '../lib/auth-client';

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function ReplaysScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthed = !!session;
  const replays = useQuery(api.social.listMyReplays, isAuthed ? {} : 'skip');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.gradientHero} style={{ paddingBottom: 22 }}>
        <SafeAreaView edges={['top']}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={6}
            >
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>
                My Replays
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 2 }}>
                Review your finished tables move-by-move.
              </Text>
            </View>
            <Ionicons name="film" size={22} color={theme.gold} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {!isAuthed && (
          <Card padding={16}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>
              Sign in to see replays
            </Text>
            <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 4 }}>
              Replays are tied to your account so we can rebuild every move.
            </Text>
          </Card>
        )}

        {isAuthed && replays === undefined && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={theme.gold} />
          </View>
        )}

        {isAuthed && replays && replays.length === 0 && (
          <Card padding={18}>
            <Ionicons name="film-outline" size={26} color={theme.textSubtle} />
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, marginTop: 8 }}>
              No replays yet
            </Text>
            <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 4 }}>
              Finish a multiplayer game and it will land here automatically.
            </Text>
          </Card>
        )}

        {isAuthed &&
          replays?.map((r) => {
            const myWind = r.mySeat >= 0 ? r.seats[r.mySeat]?.wind : '?';
            return (
              <Pressable
                key={r._id as string}
                onPress={() => router.push(`/replay/${r._id}` as any)}
                style={{ marginBottom: 10 }}
              >
                <Card variant="elevated" padding={14}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: theme.gold,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="play" size={20} color="#1a1a1a" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>
                          Table {r.code}
                        </Text>
                        <Badge label={r.mode.toUpperCase()} tone={r.mode === 'ranked' ? 'gold' : 'jade'} />
                      </View>
                      <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 2 }}>
                        Seat {myWind} · vs {r.seats.filter((_, i) => i !== r.mySeat).map((s) => s.name).join(', ')}
                      </Text>
                      <Text style={{ color: theme.textSubtle, fontSize: 11, marginTop: 2 }}>
                        {timeAgo(r.finishedAt)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
                  </View>
                </Card>
              </Pressable>
            );
          })}
      </ScrollView>
    </View>
  );
}
