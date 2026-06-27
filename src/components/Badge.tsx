import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { palette } from '@/src/theme/colors';

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
  const dark = theme.mode === 'dark';
  const styles: Record<Tone, { bg: string; fg: string }> = {
    jade: { bg: dark ? 'rgba(16,185,129,0.18)' : '#D1FAE5', fg: theme.primaryText },
    red: { bg: dark ? 'rgba(239,68,68,0.2)' : '#FEE2E2', fg: dark ? theme.accent : palette.blush.deep },
    gold: { bg: dark ? 'rgba(251,191,36,0.18)' : '#FEF3C7', fg: theme.goldText },
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
