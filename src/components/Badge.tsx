import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';

type Tone = 'jade' | 'red' | 'gold' | 'neutral';

export function Badge({
  label,
  tone = 'jade',
  style,
}: {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  const styles: Record<Tone, { bg: string; fg: string }> = {
    jade: { bg: theme.mode === 'dark' ? 'rgba(16,185,129,0.18)' : '#D1FAE5', fg: theme.primary },
    red: { bg: theme.mode === 'dark' ? 'rgba(239,68,68,0.2)' : '#FEE2E2', fg: theme.accent },
    gold: { bg: theme.mode === 'dark' ? 'rgba(251,191,36,0.18)' : '#FEF3C7', fg: theme.goldDark },
    neutral: { bg: theme.surfaceAlt, fg: theme.textMuted },
  };
  const s = styles[tone];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: s.bg,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
        },
        style,
      ]}
    >
      <Text style={{ color: s.fg, fontWeight: '700', fontSize: 11, letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

export default Badge;
