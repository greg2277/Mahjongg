import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Badge } from '@/src/components/Badge';

const GAMES = [
  { id: 'tile-match', title: 'Tile & Joker Match', tag: 'Beginner', icon: 'grid' as const, gradient: ['#10B981', '#047857'] as const },
  { id: 'card-reader', title: 'Card Reader', tag: 'Intermediate', icon: 'reader' as const, gradient: ['#DC2626', '#7F1D1D'] as const },
  { id: 'charleston', title: 'Charleston Trainer', tag: 'Beginner', icon: 'swap-horizontal' as const, gradient: ['#F59E0B', '#B45309'] as const },
  { id: 'hand-picker', title: 'Hand Picker', tag: 'Intermediate', icon: 'hand-left' as const, gradient: ['#3B82F6', '#1E3A8A'] as const },
  { id: 'discard', title: 'Discard Decision', tag: 'Advanced', icon: 'bulb' as const, gradient: ['#0E1714', '#3F4D46'] as const },
  { id: 'joker-swap', title: 'Joker Swap Drill', tag: 'Intermediate', icon: 'sparkles' as const, gradient: ['#A855F7', '#6B21A8'] as const },
];

export default function PlayScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
          Play
        </Text>
        <Text style={{ color: theme.textSubtle, fontSize: 14, marginTop: 4 }}>
          Train solo or compete with the table.
        </Text>

        {/* Practice with AI — primary solo entry point */}
        <Pressable
          onPress={() => router.push('/game/practice' as any)}
          style={{ marginTop: 18 }}
        >
          <LinearGradient
            colors={['#10B981', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 18,
              padding: 18,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.18)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="game-controller" size={26} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Badge label="Solo practice" tone="gold" />
              <Text
                style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 8, letterSpacing: -0.3 }}
              >
                Practice with AI
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 3 }}>
                Play a full game vs. 3 AI opponents before going live.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </Pressable>

        {/* Multiplayer banner */}
        <Pressable
          onPress={() => router.push('/multiplayer' as any)}
          style={{ marginTop: 18 }}
        >
          <LinearGradient
            colors={theme.gradientHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 18,
              padding: 18,
              borderWidth: 1,
              borderColor: theme.gold,
            }}
          >
            <Badge label="Live tables" tone="gold" />
            <Text
              style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 10, letterSpacing: -0.3 }}
            >
              4-player Multiplayer
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 13, marginTop: 4 }}>
              Ranked, casual, and private rooms with invite codes.
            </Text>
            <View
              style={{
                marginTop: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ color: theme.goldOnHero, fontWeight: '800', fontSize: 13 }}>
                Find a table
              </Text>
              <Ionicons name="arrow-forward" size={14} color={theme.goldOnHero} />
            </View>
          </LinearGradient>
        </Pressable>

        <Text
          style={{
            color: theme.text,
            fontSize: 16,
            fontWeight: '800',
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          Mini-games
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {GAMES.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => router.push(`/game/${g.id}` as any)}
              style={({ pressed }) => ({
                width: '47.5%',
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <LinearGradient
                colors={g.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 14, height: 140, justifyContent: 'space-between' }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={g.icon} size={18} color="#FFF" />
                </View>
                <View>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: 10,
                      fontWeight: '700',
                      letterSpacing: 1,
                    }}
                  >
                    {g.tag.toUpperCase()}
                  </Text>
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 2 }}>
                    {g.title}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
