import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import PrimaryButton from '@/src/components/PrimaryButton';

export default function SessionConfirmScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = id as unknown as Id<'ratingSessions'>;

  const session = useQuery(api.srs.getSession, id ? { sessionId } : 'skip');
  const confirmMine = useMutation(api.srs.confirmSessionTotals);
  const confirmSeat = useMutation(api.srs.confirmSeat);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }
  if (session === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, padding: 20 }}>
        <Text style={{ color: theme.text, fontSize: 16 }}>Session not found.</Text>
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="Back" variant="outline" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const rated = session.status === 'rated';

  const runMyConfirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await confirmMine({ sessionId });
    } catch (e: any) {
      setError(e?.message ?? 'Could not confirm.');
    } finally {
      setBusy(false);
    }
  };

  const runSeatConfirm = async (seatIndex: number) => {
    setError(null);
    setBusy(true);
    try {
      await confirmSeat({ sessionId, seatIndex });
    } catch (e: any) {
      setError(e?.message ?? 'Could not confirm.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.gradientHero} style={{ paddingBottom: 24 }}>
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: 12 }}>
              <Ionicons name="chevron-back" size={26} color="#FFF" />
            </Pressable>
            <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.4 }}>
              {rated ? 'Session rated' : 'Confirm totals'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 6 }}>
              {rated
                ? 'Glicko-2 ratings have been updated.'
                : `${session.confirmedCount}/2 players confirmed — two are needed to rate.`}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
        {/* Rated results */}
        {rated && session.results ? (
          <>
            <Text style={sectionTitle(theme)}>Results</Text>
            {session.results.map((r, i) => (
              <Card key={i} variant="elevated" style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>{r.name}</Text>
                    <Text style={{ color: theme.textSubtle, fontSize: 11, marginTop: 2 }}>
                      NGS {r.ngs.toFixed(2)} · {Math.round(r.beforeR)} → {Math.round(r.afterR)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge label={r.tier} tone="gold" />
                    <Text
                      style={{
                        color: r.delta >= 0 ? theme.primary : theme.danger,
                        fontWeight: '800',
                        fontSize: 14,
                      }}
                    >
                      {r.delta >= 0 ? '+' : ''}
                      {Math.round(r.delta)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
            <View style={{ marginTop: 16 }}>
              <PrimaryButton
                label="View my rating"
                size="lg"
                onPress={() => router.replace('/rating' as any)}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={sectionTitle(theme)}>Entered totals</Text>
            <Card variant="elevated" padding={4}>
              {session.seats.map((seat, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: theme.border,
                    gap: 10,
                  }}
                >
                  <Ionicons
                    name={seat.confirmed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={seat.confirmed ? theme.primary : theme.textSubtle}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>
                      {seat.name}
                      {seat.isMe ? ' (you)' : ''}
                    </Text>
                    <Text style={{ color: theme.textSubtle, fontSize: 11 }}>
                      {seat.confirmed ? 'Confirmed' : 'Not yet confirmed'}
                    </Text>
                  </View>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>
                    {seat.enteredTotal}
                  </Text>
                  {!seat.confirmed && session.isHost ? (
                    <Pressable
                      disabled={busy}
                      onPress={() => (seat.isMe ? runMyConfirm() : runSeatConfirm(seat.index))}
                      style={{
                        backgroundColor: theme.primary,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Confirm</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </Card>

            {error ? (
              <Text style={{ color: theme.danger, fontSize: 13, marginTop: 12 }}>{error}</Text>
            ) : null}

            {/* If I'm a seated co-player (not the host), I confirm my own seat. */}
            {!session.isHost && session.seats.some((s) => s.isMe && !s.confirmed) ? (
              <View style={{ marginTop: 20 }}>
                <PrimaryButton
                  label={busy ? 'Confirming…' : 'These totals are correct — confirm'}
                  size="lg"
                  loading={busy}
                  disabled={busy}
                  onPress={runMyConfirm}
                />
              </View>
            ) : null}

            <Text style={{ color: theme.textSubtle, fontSize: 11, textAlign: 'center', marginTop: 18, lineHeight: 16 }}>
              At a shared table the host taps Confirm for each player who agrees. Online, each player
              opens the session and confirms from their own device. Two confirmations rate the game.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function sectionTitle(theme: ReturnType<typeof useTheme>['theme']) {
  return {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800' as const,
    marginBottom: 10,
  };
}
