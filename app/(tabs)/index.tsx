import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useUser } from '@/src/state/userStore';
import { LogoMark, Wordmark } from '@/src/components/Logo';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import { SectionHeader } from '@/src/components/SectionHeader';
import PrimaryButton from '@/src/components/PrimaryButton';
import { Tile } from '@/src/components/Tile';
import { OnboardingTour, type TourStep } from '@/src/components/OnboardingTour';

const DASHBOARD_TOUR: TourStep[] = [
  {
    icon: 'card',
    title: 'Your NMJL Card',
    body: 'Tap the NMJL Card quick action to open the interactive card reference. Browse every legal hand pattern and filter by category any time you learn or play.',
    tone: 'gold',
  },
  {
    icon: 'shield-checkmark',
    title: 'Rule Engine Highlights',
    body: 'During a game, toggle rule highlights to see which tiles form a legal hand, exposure, or joker swap — validated live against NMJL standards.',
    tone: 'jade',
  },
  {
    icon: 'flash',
    title: 'Start AI Practice',
    body: 'Tap Practice to play a full simulated game against three AI opponents. Apply your training with no pressure before entering multiplayer.',
    tone: 'rose',
  },
];

export default function HomeScreen() {
  const { theme, mode, toggle } = useTheme();
  const { profile } = useUser();
  const router = useRouter();
  const xpToNext = profile.stats.level * 300;
  const xpProgress = Math.min(1, profile.stats.xp / xpToNext);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <OnboardingTour tourId="dashboard" steps={DASHBOARD_TOUR} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient header */}
        <LinearGradient
          colors={theme.gradientHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingBottom: 28 }}
        >
          <SafeAreaView edges={['top']}>
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <LogoMark size={42} />
                <View>
                  <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>
                    Jade Pavilion
                  </Text>
                  <Text
                    style={{
                      color: theme.gold,
                      fontSize: 10,
                      fontWeight: '700',
                      letterSpacing: 1.4,
                    }}
                  >
                    AMERICAN MAHJONG
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={toggle}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  hitSlop={6}
                >
                  <Ionicons
                    name={mode === 'dark' ? 'sunny' : 'moon'}
                    size={18}
                    color={theme.gold}
                  />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(tabs)/profile')}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  hitSlop={6}
                >
                  <Ionicons name="notifications-outline" size={18} color="#FFF" />
                </Pressable>
              </View>
            </View>

            <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 26,
                  fontWeight: '800',
                  lineHeight: 32,
                  letterSpacing: -0.5,
                }}
              >
                Welcome back,{'\n'}
                <Text style={{ color: theme.gold }}>{profile.displayName}</Text>
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.78)',
                  fontSize: 14,
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                Continue your path to mastering the NMJL card.
              </Text>

              {/* Level + streak strip */}
              <View
                style={{
                  marginTop: 20,
                  flexDirection: 'row',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.10)',
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }}>
                    LEVEL {profile.stats.level}
                  </Text>
                  <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 2 }}>
                    {profile.stats.xp.toLocaleString()} XP
                  </Text>
                  <View
                    style={{
                      marginTop: 8,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: 6,
                        width: `${xpProgress * 100}%`,
                        backgroundColor: theme.gold,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.10)',
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }}>
                    STREAK
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>
                      {profile.stats.streakDays}
                    </Text>
                    <Text style={{ fontSize: 16 }}>🔥</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 8 }}>
                    days in a row
                  </Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Continue learning card (overlapping hero) */}
        <View style={{ paddingHorizontal: 16, marginTop: -18 }}>
          <Card variant="elevated" padding={16}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Badge label="Today's lesson" tone="gold" />
              <Badge label="Beginner" tone="jade" />
            </View>
            <Text
              style={{
                color: theme.text,
                fontSize: 18,
                fontWeight: '800',
                marginTop: 10,
                letterSpacing: -0.3,
              }}
            >
              Reading the NMJL Card
            </Text>
            <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
              Decode hand lines, suits, and joker rules in 7 minutes.
            </Text>
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Tile suit="bam" value="2" size="xs" />
                <Tile suit="bam" value="2" size="xs" />
                <Tile suit="dragon" value="G" size="xs" />
                <Tile suit="joker" size="xs" />
              </View>
              <PrimaryButton
                label="Continue"
                size="md"
                onPress={() => router.push('/lesson/nmjl-card-basics' as any)}
                icon={<Ionicons name="play" size={14} color="#FFF" />}
              />
            </View>
          </Card>
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <SectionHeader title="Quick actions" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <QuickAction
              icon="flash"
              label="Practice"
              tone={theme.primary}
              onPress={() => router.push('/(tabs)/play')}
            />
            <QuickAction
              icon="people"
              label="Multiplayer"
              tone={theme.accent}
              onPress={() => router.push('/multiplayer' as any)}
            />
            <QuickAction
              icon="card"
              label="NMJL Card"
              tone={theme.gold}
              onPress={() => router.push('/(tabs)/learn')}
            />
          </View>
        </View>

        {/* Mini game spotlight */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <SectionHeader
            title="Mini-games"
            subtitle="Sharpen your reflexes"
            actionLabel="See all"
            onAction={() => router.push('/(tabs)/play')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 8 }}
          >
            <GameCard
              title="Tile & Joker Match"
              tag="Beginner"
              gradient={['#10B981', '#047857'] as const}
              icon="grid"
              onPress={() => router.push('/game/tile-match' as any)}
            />
            <GameCard
              title="Card Reader"
              tag="Intermediate"
              gradient={['#DC2626', '#7F1D1D'] as const}
              icon="reader"
              onPress={() => router.push('/game/card-reader' as any)}
            />
            <GameCard
              title="Charleston Trainer"
              tag="Beginner"
              gradient={['#F59E0B', '#B45309'] as const}
              icon="swap-horizontal"
              onPress={() => router.push('/game/charleston' as any)}
            />
            <GameCard
              title="Discard Decision"
              tag="Advanced"
              gradient={['#0E1714', '#3F4D46'] as const}
              icon="bulb"
              onPress={() => router.push('/game/discard' as any)}
            />
          </ScrollView>
        </View>

        {/* Daily challenge */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <SectionHeader title="Daily challenge" subtitle="Earn 50 XP" />
          <Card variant="elevated" padding={0} style={{ overflow: 'hidden' }}>
            <LinearGradient
              colors={theme.gradientWarm}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 18 }}
            >
              <Badge label="LIMITED" tone="gold" />
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 18,
                  fontWeight: '800',
                  marginTop: 10,
                  letterSpacing: -0.3,
                }}
              >
                Joker Swap Drill
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 13,
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                Make 8 legal joker swaps in under 60 seconds.
              </Text>
              <View
                style={{
                  marginTop: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Tile suit="joker" size="xs" />
                  <Tile suit="crak" value="5" size="xs" />
                  <Tile suit="crak" value="5" size="xs" />
                </View>
                <Pressable
                  onPress={() => router.push('/game/joker-swap' as any)}
                  style={{
                    backgroundColor: '#FFF',
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 13 }}>
                    Start →
                  </Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Card>
        </View>

        {/* Footer note */}
        <View style={{ paddingHorizontal: 16, marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: theme.textSubtle, fontSize: 11, textAlign: 'center' }}>
            NMJL® card content is © National Mah Jongg League.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: 'center',
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: tone + '22',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function GameCard({
  title,
  tag,
  gradient,
  icon,
  onPress,
}: {
  title: string;
  tag: string;
  gradient: readonly [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 170,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 130,
          borderRadius: 16,
          padding: 14,
          justifyContent: 'space-between',
        }}
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
          <Ionicons name={icon} size={18} color="#FFF" />
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
            {tag.toUpperCase()}
          </Text>
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 2 }}>
            {title}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
