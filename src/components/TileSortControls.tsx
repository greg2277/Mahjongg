import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import type { SortMode } from '@/src/games/nmjl/sort';

// Segmented control for choosing how tiles are sorted (Rank vs Suit).
// Used in rack views, hand examples, training games, and review screens.
export function TileSortControls({
  mode,
  onChange,
  compact = false,
}: {
  mode: SortMode;
  onChange: (m: SortMode) => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const options: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'rank', label: 'Rank', icon: 'swap-vertical' },
    { key: 'suit', label: 'Suit', icon: 'color-palette-outline' },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surface,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 3,
      }}
    >
      {options.map((opt) => {
        const active = mode === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            hitSlop={6}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: compact ? 10 : 14,
              paddingVertical: compact ? 5 : 7,
              borderRadius: 999,
              backgroundColor: active ? theme.text : 'transparent',
            }}
          >
            <Ionicons name={opt.icon} size={13} color={active ? theme.bg : theme.textSubtle} />
            <Text
              style={{
                color: active ? theme.bg : theme.textSubtle,
                fontSize: 12,
                fontWeight: '800',
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default TileSortControls;
