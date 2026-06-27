import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import { LESSONS, TIER_META, type LessonTier } from '@/src/content/lessons';
import { useUser } from '@/src/state/userStore';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { CoachTip } from '@/src/components/CoachTip';

const TIERS: LessonTier[] = ['beginner', 'intermediate', 'advanced'];

export default function LearnScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { profile } = useUser();
  const [activeTier, setActiveTier] = useState<LessonTier>('beginner');

  const tierLessons = LESSONS.filter((l) => l.tier === activeTier);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
          Learn
        </Text>
        <Text style={{ color: theme.textSubtle, fontSize: 14, marginTop: 4 }}>
          Three tiers of guided NMJL mastery.
        </Text>

        <View style={{ marginTop: 14 }}>
          <OfflineBanner />
        </View>

        <CoachTip
          id="learn-intro"
          title="Lessons work offline"
          body="Open any lesson once and it's cached on your device. Practice on the subway, on a flight, or in the mahjong room."
          icon="cloud-done"
          tone="jade"
        />

        {/* Card reference entry */}
        <Pressable
          onPress={() => router.push('/card' as any)}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, marginTop: 16 })}
        >
          <Card variant="elevated" padding={16}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: theme.accent + '1A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="albums" size={24} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
                  NMJL Card Reference
                </Text>
                <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 2 }}>
                  Browse every 2026 hand pattern with live tiles.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
            </View>
          </Card>
        </Pressable>

        {/* Progress chip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
            padding: 14,
            backgroundColor: theme.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View>
            <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
              YOUR PROGRESS
            </Text>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginTop: 2 }}>
              {profile.stats.lessonsCompleted} / {LESSONS.length} lessons
            </Text>
          </View>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.primary + '22',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="school" size={22} color={theme.primary} />
          </View>
        </View>

        {/* Tier tabs */}
        <View style={{ flexDirection: 'row', marginTop: 20, gap: 8 }}>
          {TIERS.map((t) => {
            const meta = TIER_META[t];
            const active = activeTier === t;
            return (
              <Pressable
                key={t}
                onPress={() => setActiveTier(t)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: active ? theme.text : theme.surface,
                  borderWidth: 1,
                  borderColor: active ? theme.text : theme.border,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: active ? theme.bg : theme.text,
                    fontSize: 12,
                    fontWeight: '800',
                    textTransform: 'capitalize',
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tier description */}
        <View style={{ marginTop: 18, marginBottom: 4 }}>
          <Badge label={TIER_META[activeTier].title.split('—')[0].trim()} tone={TIER_META[activeTier].tone} />
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 8, letterSpacing: -0.3 }}>
            {TIER_META[activeTier].title.split('—')[1]?.trim() ?? TIER_META[activeTier].title}
          </Text>
          <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
            {TIER_META[activeTier].description}
          </Text>
        </View>

        {/* Lesson list */}
        <View style={{ marginTop: 14, gap: 10 }}>
          {tierLessons.map((lesson, idx) => (
            <Pressable
              key={lesson.id}
              onPress={() => router.push(`/lesson/${lesson.id}` as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Card variant="elevated" padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: theme.primary + '18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: '900' }}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
                      {lesson.title}
                    </Text>
                    <Text
                      style={{ color: theme.textSubtle, fontSize: 12, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {lesson.summary}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <Ionicons name="time-outline" size={11} color={theme.textSubtle} />
                      <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '600' }}>
                        {lesson.duration}
                      </Text>
                      <Text style={{ color: theme.textSubtle, fontSize: 11 }}>·</Text>
                      <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '600' }}>
                        {lesson.steps.length} steps
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
