import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useSession } from '@/lib/auth-client';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import PrimaryButton from '@/src/components/PrimaryButton';
import { tierForRating } from '@/src/rating';

function confidenceLabel(rd: number): string {
  if (rd < 80) return 'Very high confidence';
  if (rd < 120) return 'High confidence';
  if (rd < 150) return 'Moderate confidence';
  return 'Provisional — play more to settle';
}

export default function RatingHomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const rating = useQuery(api.srs.getMyRating, session ? {} : 'skip');
  const sessions = useQuery(api.srs.getMySessions, session ? {} : 'skip');

  const loading = rating === undefined && session;

  const R = rating?.R ?? 1500;
  const tier = rating?.tier ?? tierForRating(R).name;
  const history = rating?.history ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.gradientHero} style={{ paddingBottom: 28 }}>
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: 12 }}>
              <Ionicons name="chevron-back" size={26} color="#FFF" />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>
              SPARROW RATING
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 }}>
              <Text style={{ color: '#FFF', fontSize: 52, fontWeight: '800', letterSpacing: -1 }}>
                {Math.round(R)}
              </Text>
              <View style={{ marginBottom: 10 }}>
                <Badge label={tier} tone="gold" />
              </View>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 13, marginTop: 2 }}>
              {rating ? confidenceLabel(rating.RD) : 'Sign in to track your rating'}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : null}

        {/* Stat row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatTile label="Games" value={String(rating?.gamesPlayed ?? 0)} />
          <StatTile label="Deviation" value={String(Math.round(rating?.RD ?? 350))} />
          <StatTile
            label="Status"
            value={rating?.provisional === false ? 'Ranked' : 'Provisional'}
          />
        </View>

        {/* History sparkline */}
        <Text style={sectionTitle(theme)}>Rating history</Text>
        <Card variant="elevated">
          {history.length === 0 ? (
            <Text style={{ color: theme.textSubtle, fontSize: 13 }}>
              No rated sessions yet. Finish a game, enter everyone's points, and get two players to
              confirm to earn your first rating.
            </Text>
          ) : (
            <Sparkline values={history.map((h) => h.R)} />
          )}
        </Card>

        {/* Pending corroboration */}
        {sessions && sessions.length > 0 ? (
          <>
            <Text style={sectionTitle(theme)}>Awaiting confirmation</Text>
            <Card variant="elevated" padding={4}>
              {sessions.map((s, i) => (
                <Pressable
                  key={s._id as string}
                  onPress={() => router.push(`/rating/${s._id}` as any)}
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
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: theme.gold + '22',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="hourglass" size={16} color={theme.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                      {s.seats.map((seat) => seat.name).join(', ')}
                    </Text>
                    <Text style={{ color: theme.textSubtle, fontSize: 11 }}>
                      {s.confirmedCount}/2 confirmations ·{' '}
                      {s.mySeatConfirmed ? 'you confirmed' : 'tap to confirm'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}

        <View style={{ marginTop: 24 }}>
          <PrimaryButton
            label="Enter a finished session"
            size="lg"
            icon={<Ionicons name="add-circle" size={18} color="#FFF" />}
            onPress={() => router.push('/rating/new-session' as any)}
          />
        </View>

        <Text style={{ color: theme.textSubtle, fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 }}>
          Ratings use Glicko-2 across the table. Two of four players must confirm the final point
          totals before a session counts.
        </Text>
      </ScrollView>
    </View>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const { theme } = useTheme();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const latest = values[values.length - 1];
  const first = values[0];
  const trend = latest - first;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 64 }}>
        {values.map((v, i) => {
          const h = 8 + ((v - min) / range) * 52;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                borderRadius: 3,
                backgroundColor: i === values.length - 1 ? theme.primary : theme.primary + '55',
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ color: theme.textSubtle, fontSize: 11 }}>
          {values.length} session{values.length === 1 ? '' : 's'}
        </Text>
        <Text
          style={{
            color: trend >= 0 ? theme.primary : theme.danger,
            fontSize: 11,
            fontWeight: '800',
          }}
        >
          {trend >= 0 ? '▲' : '▼'} {Math.abs(Math.round(trend))} pts
        </Text>
      </View>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: theme.textSubtle, fontSize: 10, marginTop: 2, fontWeight: '700' }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function sectionTitle(theme: ReturnType<typeof useTheme>['theme']) {
  return {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800' as const,
    marginTop: 22,
    marginBottom: 10,
  };
}
