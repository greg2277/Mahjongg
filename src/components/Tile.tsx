import React, { useState } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useTheme } from '@/src/theme/ThemeProvider';
import { resolveTileAsset } from './tileAssets';

// Renders a single American Mahjong tile using the user's real uploaded SVG art.
// Every card.json token is mapped to its uploaded CDN SVG in tileAssets.ts:
//   Bam 1-9, Crak 1-9, Dot 1-9, Winds (N/E/S/W), Dragons (R=中, G=發, Wh=Soap),
//   Flower, Joker, and the year-hand '0' token (renders Soap / White Dragon).
// If an asset is ever missing it falls back to a readable text glyph so a hand
// never shows a blank placeholder.

export type TileSuit = 'bam' | 'crak' | 'dot' | 'wind' | 'dragon' | 'flower' | 'joker';

export type TileSpec = {
  suit: TileSuit;
  value?: string;
};

// Chinese numerals for Crak fallback (never the letter "C").
const CRAK_NUMERALS: Record<string, string> = {
  '0': '零', '1': '一', '2': '二', '3': '三', '4': '四',
  '5': '五', '6': '六', '7': '七', '8': '八', '9': '九',
};

const sizeMap = {
  xs: { w: 38, h: 50, value: 18, radius: 6 },
  sm: { w: 44, h: 56, value: 22, radius: 7 },
  md: { w: 56, h: 76, value: 28, radius: 9 },
  lg: { w: 72, h: 96, value: 34, radius: 12 },
};

export type TileSize = keyof typeof sizeMap;

function FallbackGlyph({
  suit,
  value,
  fontSize,
}: {
  suit: TileSuit;
  value?: string;
  fontSize: number;
}) {
  if (suit === 'joker') {
    return <Text style={{ fontSize: fontSize + 2, color: '#7C3AED', fontWeight: '900' }}>★</Text>;
  }
  if (suit === 'flower') {
    return <Text style={{ fontSize, fontWeight: '800' }}>🌸</Text>;
  }
  if (suit === 'crak') {
    return (
      <Text style={{ fontSize, color: '#B91C1C', fontWeight: '900' }}>
        {CRAK_NUMERALS[value ?? '1'] ?? value ?? '?'}
      </Text>
    );
  }
  if (suit === 'dragon') {
    const txt = value === 'G' ? '發' : value === 'R' ? '中' : 'B';
    const col = value === 'G' ? '#047857' : value === 'R' ? '#B91C1C' : '#1F3A8A';
    return <Text style={{ fontSize, color: col, fontWeight: '900' }}>{txt}</Text>;
  }
  return (
    <Text style={{ fontSize, color: '#0E1714', fontWeight: '900' }}>{value ?? '?'}</Text>
  );
}

export function Tile({
  suit,
  value,
  size = 'md',
  selected = false,
  faded = false,
  style,
}: {
  suit: TileSuit;
  value?: string;
  size?: TileSize;
  selected?: boolean;
  faded?: boolean;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  const dims = sizeMap[size];
  const uri = resolveTileAsset(suit, value);
  const [errored, setErrored] = useState(false);

  // Inner art area (small inset so the tile body border shows around the SVG).
  const innerW = dims.w - 4;
  const innerH = dims.h - 4;

  return (
    <View
      style={[
        {
          width: dims.w,
          height: dims.h,
          borderRadius: dims.radius,
          backgroundColor: '#FFFFFF',
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 4,
          opacity: faded ? 0.45 : 1,
          borderWidth: selected ? 2.5 : 1,
          borderColor: selected ? theme.gold : '#E0D5B7',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {uri && !errored ? (
        <SvgUri
          uri={uri}
          width={innerW}
          height={innerH}
          onError={() => setErrored(true)}
        />
      ) : (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <FallbackGlyph suit={suit} value={value} fontSize={dims.value} />
        </View>
      )}
    </View>
  );
}

export default Tile;
