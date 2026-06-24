import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/src/theme/ThemeProvider';

// ─────────────────────────────────────────────────────────────────────────
// OnboardingTour — a lightweight, high-contrast walkthrough overlay.
//
// Renders a sequence of focused tooltip cards over a dimmed backdrop. Users
// can step Next/Back, or Skip the whole tour. Completion/skip is persisted
// per-tour so it never reappears during this demo session.
//
// Session semantics: dismissal is written to AsyncStorage AND mirrored to an
// in-memory set, so even a fresh AsyncStorage read never re-triggers a tour
// the user already dismissed this session.
// ─────────────────────────────────────────────────────────────────────────

export type TourStep = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  tone?: 'jade' | 'gold' | 'rose';
};

type Props = {
  tourId: string;
  steps: TourStep[];
  // Optional: bypass dismissal persistence (used by a "Show me around" button).
  forceShow?: boolean;
  onClose?: () => void;
};

const KEY = (id: string) => `jp.tour.dismissed.${id}`;

// In-memory guard so a tour never replays within the same session.
const sessionDismissed = new Set<string>();

export function OnboardingTour({ tourId, steps, forceShow, onClose }: Props) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (forceShow) {
        if (mounted) {
          setIndex(0);
          setVisible(true);
        }
        return;
      }
      if (sessionDismissed.has(tourId)) return;
      try {
        const dismissed = await AsyncStorage.getItem(KEY(tourId));
        if (mounted && !dismissed) setVisible(true);
      } catch {
        if (mounted) setVisible(true);
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, [tourId, forceShow]);

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    pop.setValue(0.92);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [visible, index, fade, pop]);

  const finish = async () => {
    sessionDismissed.add(tourId);
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setVisible(false);
      onClose?.();
    });
    try {
      await AsyncStorage.setItem(KEY(tourId), '1');
    } catch {
      // ignore
    }
  };

  const next = () => {
    if (index < steps.length - 1) {
      pop.setValue(0.94);
      setIndex((i) => i + 1);
    } else {
      void finish();
    }
  };

  const back = () => {
    if (index > 0) {
      pop.setValue(0.94);
      setIndex((i) => i - 1);
    }
  };

  if (!visible || steps.length === 0) return null;

  const step = steps[index];
  const accent =
    step.tone === 'gold' ? theme.gold : step.tone === 'rose' ? '#E11D48' : theme.primary;
  const isLast = index === steps.length - 1;
  const { width } = Dimensions.get('window');
  const cardWidth = Math.min(width - 40, 360);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => void finish()}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fade,
          backgroundColor: 'rgba(6, 12, 10, 0.82)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        {/* Skip — top right */}
        <Pressable
          onPress={() => void finish()}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: 56,
            right: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.14)',
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Skip tour</Text>
          <Ionicons name="close" size={14} color="#FFF" />
        </Pressable>

        <Animated.View
          style={{
            width: cardWidth,
            transform: [{ scale: pop }],
            backgroundColor: theme.surface,
            borderRadius: 22,
            padding: 22,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 16,
          }}
        >
          {/* Icon badge */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: accent + '22',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons name={step.icon} size={28} color={accent} />
          </View>

          <Text
            style={{
              color: accent,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.4,
            }}
          >
            {`STEP ${index + 1} OF ${steps.length}`}
          </Text>
          <Text
            style={{
              color: theme.text,
              fontSize: 21,
              fontWeight: '800',
              marginTop: 6,
              letterSpacing: -0.4,
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

          {/* Progress dots */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 18 }}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: i === index ? 22 : 6,
                  backgroundColor: i === index ? accent : theme.border,
                }}
              />
            ))}
          </View>

          {/* Controls */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 20,
            }}
          >
            <Pressable
              onPress={back}
              disabled={index === 0}
              hitSlop={8}
              style={{ opacity: index === 0 ? 0 : 1, paddingVertical: 8, paddingHorizontal: 4 }}
            >
              <Text style={{ color: theme.textSubtle, fontSize: 15, fontWeight: '700' }}>Back</Text>
            </Pressable>

            <Pressable
              onPress={next}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: accent,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
                {isLast ? 'Got it' : 'Next'}
              </Text>
              <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={16} color="#FFF" />
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** Reset a dismissed tour so it can be replayed (e.g. "Show me around"). */
export async function resetTour(tourId: string): Promise<void> {
  sessionDismissed.delete(tourId);
  try {
    await AsyncStorage.removeItem(KEY(tourId));
  } catch {
    // ignore
  }
}
