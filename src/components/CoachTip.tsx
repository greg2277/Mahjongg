import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/src/theme/ThemeProvider';

type Tone = 'jade' | 'gold' | 'rose';

type Props = {
  id: string; // unique key — once dismissed, never shown again
  title: string;
  body: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  forceShow?: boolean; // bypass dismissal (used by "Show me around")
};

const KEY = (id: string) => `jp.coach.dismissed.${id}`;

/**
 * CoachTip — a friendly coach-style tooltip. Slides in, can be dismissed.
 * Persists dismissal so users only see each tip once unless `forceShow`.
 */
export function CoachTip({ id, title, body, tone = 'jade', icon = 'sparkles', forceShow }: Props) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const slide = useRef(new Animated.Value(12)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (forceShow) {
        if (mounted) setVisible(true);
        return;
      }
      try {
        const dismissed = await AsyncStorage.getItem(KEY(id));
        if (mounted && !dismissed) setVisible(true);
      } catch {
        if (mounted) setVisible(true);
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, [id, forceShow]);

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [visible, fade, slide]);

  const dismiss = async () => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 8, duration: 220, useNativeDriver: true }),
    ]).start(() => setVisible(false));
    try {
      await AsyncStorage.setItem(KEY(id), '1');
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  const accent =
    tone === 'gold' ? theme.gold : tone === 'rose' ? '#E11D48' : theme.primary;

  return (
    <Animated.View
      style={{
        opacity: fade,
        transform: [{ translateY: slide }],
        marginVertical: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          padding: 14,
          borderRadius: 14,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderLeftWidth: 3,
          borderLeftColor: accent,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: accent + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                color: accent,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.2,
              }}
            >
              COACH
            </Text>
            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: theme.textSubtle,
              }}
            />
            <Text
              style={{
                color: theme.textSubtle,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1,
              }}
            >
              TIP
            </Text>
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 14,
              fontWeight: '800',
              marginTop: 3,
              letterSpacing: -0.2,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: theme.textSubtle,
              fontSize: 13,
              marginTop: 3,
              lineHeight: 19,
            }}
          >
            {body}
          </Text>
        </View>
        <Pressable
          onPress={dismiss}
          hitSlop={10}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={14} color={theme.textSubtle} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** Reset every dismissed coach tip — call from "Show me around" button. */
export async function resetCoachTips(ids: string[]): Promise<void> {
  try {
    await Promise.all(ids.map((id) => AsyncStorage.removeItem(KEY(id))));
  } catch {
    // ignore
  }
}
