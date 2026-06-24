import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import PrimaryButton from '@/src/components/PrimaryButton';
import { Tile } from '@/src/components/Tile';
import { TileSortControls } from '@/src/components/TileSortControls';
import { sortTiles, type SortMode } from '@/src/games/nmjl/sort';
import { assertFullHand } from '@/src/games/nmjl/sort';
import { getLesson, TIER_META } from '@/src/content/lessons';
import { useUser } from '@/src/state/userStore';
import { useStatsSync } from '@/src/hooks/useStatsSync';
import { CoachTip } from '@/src/components/CoachTip';
import { OfflineBanner } from '@/src/components/OfflineBanner';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { completeLesson, addXP } = useUser();
  const { recordLesson } = useStatsSync();
  const lesson = getLesson(String(id ?? ''));
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('suit');

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(16);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [stepIdx, fade, slide]);

  if (!lesson) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, padding: 20 }}>
        <Text style={{ color: theme.text, fontSize: 18 }}>Lesson not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const tierMeta = TIER_META[lesson.tier];
  const step = lesson.steps[stepIdx];
  const isLast = stepIdx === lesson.steps.length - 1;
  const progress = ((stepIdx + 1) / lesson.steps.length) * 100;

  const onNext = () => {
    if (isLast) {
      completeLesson();
      addXP(40);
      setDone(true);
    } else {
      setStepIdx((i) => i + 1);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="chevron-back" size={22} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>Back</Text>
          </Pressable>
          <Text style={{ color: theme.textSubtle, fontSize: 12, fontWeight: '700' }}>
            {stepIdx + 1} / {lesson.steps.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            backgroundColor: theme.border,
            borderRadius: 2,
            marginTop: 12,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: theme.primary,
              borderRadius: 2,
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <OfflineBanner />
        <Badge label={tierMeta.title.split('—')[0].trim()} tone={tierMeta.tone} />
        <Text
          style={{
            color: theme.text,
            fontSize: 24,
            fontWeight: '800',
            marginTop: 8,
            letterSpacing: -0.5,
          }}
        >
          {lesson.title}
        </Text>
        <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
          {lesson.summary}
        </Text>

        {stepIdx === 0 && !done ? (
          <CoachTip
            id={`lesson-coach-${lesson.id}`}
            title="Take it slow"
            body="Read each step, study the tiles, then tap Next. You can always go back — your progress is saved."
            icon="compass"
            tone="gold"
          />
        ) : null}

        {done ? (
          <Card variant="elevated" padding={20} style={{ marginTop: 24 }}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: theme.primary + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Ionicons name="checkmark-circle" size={40} color={theme.primary} />
              </View>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 20,
                  fontWeight: '800',
                  letterSpacing: -0.3,
                }}
              >
                Lesson complete
              </Text>
              <Text
                style={{
                  color: theme.textSubtle,
                  fontSize: 13,
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                +40 XP earned. Keep the streak going.
              </Text>
              <View style={{ marginTop: 20, width: '100%' }}>
                <PrimaryButton label="Back to lessons" size="lg" onPress={() => router.back()} />
              </View>
            </View>
          </Card>
        ) : (
          <Animated.View
            style={{
              opacity: fade,
              transform: [{ translateY: slide }],
              marginTop: 20,
            }}
          >
            <Card variant="elevated" padding={18}>
              <Text
                style={{
                  color: theme.textSubtle,
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 1,
                }}
              >
                STEP {stepIdx + 1}
              </Text>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 18,
                  fontWeight: '800',
                  marginTop: 6,
                  letterSpacing: -0.3,
                }}
              >
                {step.title}
              </Text>
              <Text
                style={{
                  color: theme.textSubtle,
                  fontSize: 14,
                  marginTop: 8,
                  lineHeight: 21,
                }}
              >
                {step.body}
              </Text>

              {step.tiles && step.tiles.length > 0 ? (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <TileSortControls mode={sortMode} onChange={setSortMode} compact />
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      backgroundColor: theme.bg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      justifyContent: 'center',
                    }}
                  >
                    {sortTiles(step.tiles as any, sortMode).map((t, i) => (
                      <AnimatedTile key={`${stepIdx}-${i}`} index={i} tile={t} />
                    ))}
                  </View>
                </View>
              ) : null}

              {step.callout ? (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    marginTop: 14,
                    padding: 12,
                    backgroundColor: theme.gold + '18',
                    borderLeftWidth: 3,
                    borderLeftColor: theme.gold,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="bulb" size={16} color={theme.gold} style={{ marginTop: 1 }} />
                  <Text
                    style={{
                      flex: 1,
                      color: theme.text,
                      fontSize: 13,
                      lineHeight: 19,
                      fontWeight: '600',
                    }}
                  >
                    {step.callout}
                  </Text>
                </View>
              ) : null}
            </Card>

            {/* Step nav */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              {stepIdx > 0 ? (
                <Pressable
                  onPress={() => setStepIdx((i) => i - 1)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Previous</Text>
                </Pressable>
              ) : null}
              <View style={{ flex: stepIdx > 0 ? 1.4 : 1 }}>
                <PrimaryButton
                  label={isLast ? 'Finish lesson' : 'Next step'}
                  onPress={onNext}
                  size="lg"
                />
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AnimatedTile({ tile, index }: { tile: { suit: any; value?: string }; index: number }) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    fade.setValue(0);
    lift.setValue(10);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 260,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 300,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, lift, index]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: lift }] }}>
      <Tile suit={tile.suit} value={tile.value} size="md" />
    </Animated.View>
  );
}
