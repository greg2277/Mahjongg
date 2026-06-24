import React from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';

const TYPE_LABEL: Record<string, { icon: string; label: string; color: string }> = {
  game_start: { icon: 'flag', label: 'Game start', color: '#10B981' },
  deal: { icon: 'shuffle', label: 'Tiles dealt', color: '#3B82F6' },
  draw: { icon: 'arrow-down', label: 'Draw', color: '#6B7280' },
  discard: { icon: 'arrow-up', label: 'Discard', color: '#DC2626' },
  call_pung: { icon: 'people', label: 'Pung', color: '#F59E0B' },
  call_kong: { icon: 'people-circle', label: 'Kong', color: '#F59E0B' },
  mahjong: { icon: 'trophy', label: 'Mahjong!', color: '#D4AF37' },
  chat: { icon: 'chatbubble', label: 'Chat', color: '#6B7280' },
  reaction: { icon: 'happy', label: 'Reaction', color: '#A855F7' },
  spectator_join: { icon: 'eye', label: 'Spectator joined', color: '#6B7280' },
  timeout: { icon: 'time', label: 'Timeout', color: '#9CA3AF' },
  wall_empty: { icon: 'ban', label: 'Wall exhausted', color: '#9CA3AF' },
};

export default function ReplayScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useQuery(
    api.social.getReplay,
    id ? { roomId: id as Id<'rooms'> } : 'skip'
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.gradientHero} style={{ paddingBottom: 18 }}>
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
            >
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>
                Replay
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {data?.room?.code ? `Table ${data.room.code}` : 'Loading...'}
              </Text>
            </View>
            {data?.room ? (
              <Badge label={data.room.mode.toUpperCase()} tone="gold" />
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {!data ? (
          <Text style={{ color: theme.textSubtle, fontSize: 14 }}>Loading replay…</Text>
        ) : (
          <>
            <Card padding={14}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>
                Players
              </Text>
              <View style={{ marginTop: 8, gap: 6 }}>
                {data.room.seats.map((s, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: theme.gold,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#000', fontSize: 11, fontWeight: '800' }}>
                          {s.wind}
                        </Text>
                      </View>
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                        {s.name}
                      </Text>
                      {s.isAI ? <Badge label="AI" tone="jade" /> : null}
                    </View>
                    <Text style={{ color: theme.textSubtle, fontSize: 11 }}>
                      ELO {s.elo}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <Text
              style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: '800',
                marginTop: 18,
                marginBottom: 10,
              }}
            >
              Timeline ({data.timeline.length} events)
            </Text>

            <View style={{ gap: 8 }}>
              {data.timeline.map((m) => {
                const meta = TYPE_LABEL[m.type] ?? {
                  icon: 'ellipsis-horizontal',
                  label: m.type,
                  color: '#6B7280',
                };
                const seat = m.seat < 4 ? data.room.seats[m.seat] : null;
                const detail =
                  m.type === 'discard' && m.payload?.tile
                    ? m.payload.tile
                    : m.type === 'chat' && m.payload?.text
                    ? `"${m.payload.text}"`
                    : m.type === 'reaction' && m.payload?.emoji
                    ? m.payload.emoji
                    : m.type === 'mahjong'
                    ? `+${m.payload?.points ?? 25} pts`
                    : '';
                return (
                  <View
                    key={m.seq}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: meta.color + '22',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>
                        {meta.label}
                        {detail ? <Text style={{ color: theme.textSubtle }}>  {detail}</Text> : null}
                      </Text>
                      <Text style={{ color: theme.textSubtle, fontSize: 11 }}>
                        {seat ? `${seat.wind} · ${seat.name}` : '—'}
                      </Text>
                    </View>
                    <Text style={{ color: theme.textSubtle, fontSize: 10 }}>#{m.seq}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
