import React from 'react';
import { Image, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// Sparrow brand mark — the real white-sparrow-on-sage logo (assets/images/icon.png),
// sized to fit the header badge with a soft gold frame.
const SPARROW_MARK = require('../../assets/images/icon.png');

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
      <Image
        source={SPARROW_MARK}
        resizeMode="cover"
        style={{ width: '100%', height: '100%' }}
        accessibilityLabel="Sparrow logo"
      />
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
        Sparrow
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 11, color: theme.gold, fontWeight: '700', letterSpacing: 1.5 }}>
          AMERICAN MAHJONG
        </Text>
      ) : null}
    </View>
  );
}
