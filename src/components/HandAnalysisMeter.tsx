import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Tile } from '@/src/components/Tile';
import {
  analyzeHand,
  suggestDiscards,
  type PatternProgress,
} from '@/src/logic/handAnalyzer';
import type { Tile as RuleTile } from '@/src/games/nmjl';

// Visualizes how close the player's hand is to completing NMJL card lines,
// plus which tiles are safest to discard. Educational, read-only.

function ProgressBar({ percent, color, track }: { percent: number; color: string; track: string }) {
  const pct = Math.max(0, Math.min(1, percent));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

function PatternRow({
  prog,
  rank,
}: {
  prog: PatternProgress;
  rank: number;
}) {
  const { theme } = useTheme();
  const pct = Math.round(prog.percent * 100);
  const barColor = pct >= 80 ? theme.gold : pct >= 50 ? theme.primary : theme.danger;
  return (
    <View style={{ marginTop: rank === 0 ? 0 : 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
            {prog.pattern.description}
          </Text>
          <Text style={{ color: theme.textSubtle, fontSize: 11, marginTop: 2 }}>
            {prog.matched}/{prog.total} tiles
            {prog.jokersUsed > 0 ? ` · ${prog.jokersUsed} joker${prog.jokersUsed > 1 ? 's' : ''}` : ''}
            {` · ${prog.pattern.points} pts`}
          </Text>
        </View>
        <Text style={{ color: barColor, fontSize: 15, fontWeight: '900' }}>{pct}%</Text>
      </View>
      <View style={{ marginTop: 6 }}>
        <ProgressBar percent={prog.percent} color={barColor} track={theme.border} />
      </View>
    </View>
  );
}

export function HandAnalysisMeter({
  hand,
  year,
  topN = 3,
}: {
  hand: RuleTile[];
  year: number;
  topN?: number;
}) {
  const { theme } = useTheme();

  const ranked = useMemo(() => analyzeHand(hand, year).slice(0, topN), [hand, year, topN]);
  const discards = useMemo(() => suggestDiscards(hand, year, topN), [hand, year, topN]);

  const discardTiles = useMemo(
    () =>
      discards
        .map((d) => ({ tile: hand.find((t) => t.id === d.tileId), reason: d.reason }))
        .filter((x): x is { tile: RuleTile; reason: string } => !!x.tile),
    [discards, hand],
  );

  if (ranked.length === 0) {
    return (
      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
        <Text style={{ color: theme.textSubtle, fontSize: 13 }}>No card loaded to analyze.</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Ionicons name="analytics" size={16} color={theme.primary} />
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>Closest hands</Text>
      </View>

      {ranked.map((prog, i) => (
        <PatternRow key={prog.pattern.id} prog={prog} rank={i} />
      ))}

      {discardTiles.length > 0 ? (
        <View
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Ionicons name="trash-bin-outline" size={15} color={theme.danger} />
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>Safest to discard</Text>
          </View>
          <View style={{ gap: 10 }}>
            {discardTiles.map(({ tile, reason }) => (
              <View key={tile.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Tile suit={tile.suit} value={tile.value} size="xs" />
                <Text style={{ color: theme.textSubtle, fontSize: 12, flex: 1, lineHeight: 17 }}>
                  {reason}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default HandAnalysisMeter;
