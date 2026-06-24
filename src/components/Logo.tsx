import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';

// Decorative jade pavilion mark — uses RN primitives, no images.
export function LogoMark({ size = 44 }: { size?: number }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: theme.gold,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      <LinearGradient
        colors={theme.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text
          style={{
            color: theme.gold,
            fontSize: size * 0.42,
            fontWeight: '900',
            letterSpacing: -1,
          }}
        >
          翡
        </Text>
      </LinearGradient>
    </View>
  );
}

export function Wordmark({ subtitle = true }: { subtitle?: boolean }) {
  const { theme } = useTheme();
  return (
    <View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: '800',
          color: theme.text,
          letterSpacing: -0.4,
        }}
      >
        Jade Pavilion
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 11, color: theme.gold, fontWeight: '700', letterSpacing: 1.5 }}>
          AMERICAN MAHJONG
        </Text>
      ) : null}
    </View>
  );
}
