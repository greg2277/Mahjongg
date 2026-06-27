import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import { Tile, type TileSpec, type TileSuit } from '@/src/components/Tile';
import {
  getYearCard,
  type HandGroup,
  type HandPattern,
  type TileMatcher,
} from '@/src/games/nmjl/rules';
import { TileSortControls } from '@/src/components/TileSortControls';
import { sortTiles, type SortMode } from '@/src/games/nmjl/sort';

// Side-effect import: registers the NMJL 2026 card into the rule registry
// so getYearCard(2026) returns the hand patterns.
import '@/src/games/nmjl/cards/2026';
import { CURRENT_CARD_YEAR } from '@/src/games/nmjl/currentCard';

// ─────────── Category metadata ───────────

type CategoryKey = HandPattern['category'];

const CATEGORY_META: Record<CategoryKey, { label: string; tone: 'jade' | 'red' | 'gold' | 'neutral' }> = {
  '2026': { label: '2026', tone: 'red' },
  '2468': { label: 'Even (2468)', tone: 'jade' },
  '13579': { label: 'Odd (13579)', tone: 'jade' },
  '369': { label: '3·6·9', tone: 'gold' },
  ANY_LIKE_NUMBERS: { label: 'Like Numbers', tone: 'neutral' },
  ADDITION: { label: 'Addition', tone: 'neutral' },
  QUINTS: { label: 'Quints', tone: 'gold' },
  CONSECUTIVE_RUN: { label: 'Consecutive Run', tone: 'jade' },
  WINDS_DRAGONS: { label: 'Winds & Dragons', tone: 'red' },
  SINGLES_PAIRS: { label: 'Singles & Pairs', tone: 'gold' },
};

// Rotating suits for "any suit" matchers so adjacent groups read as
// visually distinct blocks (matches how the printed card is colored).
const ANY_SUITS: TileSuit[] = ['bam', 'crak', 'dot'];

function matcherToSpec(m: TileMatcher, anySuitIndex: number): TileSpec {
  switch (m.kind) {
    case 'exact':
      return { suit: m.suit as TileSuit, value: m.value };
    case 'anySuit':
      return { suit: ANY_SUITS[anySuitIndex % ANY_SUITS.length], value: m.value };
    case 'wind':
      return { suit: 'wind', value: m.value };
    case 'dragon':
      return { suit: 'dragon', value: m.value };
    case 'flower':
      return { suit: 'flower', value: 'F' };
    case 'anyDragon':
      return { suit: 'dragon', value: 'R' }; // display as Red dragon placeholder
    case 'matchingDragon':
      return { suit: 'dragon', value: 'G' }; // display as Green dragon placeholder
    case 'oppositeDragon':
      return { suit: 'dragon', value: 'Wh' }; // display as White dragon placeholder
    case 'consec':
      return { suit: ANY_SUITS[anySuitIndex % ANY_SUITS.length], value: String(m.offset + 1) };
    case 'anyOf':
      return { suit: ANY_SUITS[anySuitIndex % ANY_SUITS.length], value: m.values[0] ?? '?' };
  }
}

const COUNT_LABEL: Record<number, string> = {
  1: 'Single',
  2: 'Pair',
  3: 'Pung',
  4: 'Kong',
  5: 'Quint',
  6: 'Sextet',
};

function HandGroupBlock({ group, anySuitIndex }: { group: HandGroup; anySuitIndex: number }) {
  const spec = matcherToSpec(group.match, anySuitIndex);
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: group.count }).map((_, i) => (
        <Tile key={i} suit={spec.suit} value={spec.value} size="xs" />
      ))}
    </View>
  );
}

function HandRow({ pattern, sortMode }: { pattern: HandPattern; sortMode: SortMode }) {
  const { theme } = useTheme();
  let anyCounter = 0;

  // Build the concrete tile list for this hand (for count badge + sorting).
  let anyIdx = 0;
  const tileSpecs: { spec: TileSpec; count: number }[] = pattern.groups.map((g) => {
    const idx = g.match.kind === 'anySuit' ? anyIdx++ : 0;
    return { spec: matcherToSpec(g.match, idx), count: g.count };
  });
  const flatTiles: TileSpec[] = [];
  for (const t of tileSpecs) for (let i = 0; i < t.count; i++) flatTiles.push(t.spec);
  const sortedTiles = sortTiles(flatTiles, sortMode);
  const tileCount = flatTiles.length;

  return (
    <Card variant="elevated" padding={14} style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', flex: 1, letterSpacing: -0.2 }}>
          {pattern.description}
        </Text>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              backgroundColor: theme.gold + '22',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Ionicons name="star" size={11} color={theme.goldDark} />
            <Text style={{ color: theme.goldDark, fontSize: 12, fontWeight: '800' }}>{pattern.points}</Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              backgroundColor: (tileCount === 14 ? theme.primary : '#B91C1C') + '22',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Ionicons
              name={tileCount === 14 ? 'checkmark-circle' : 'alert-circle'}
              size={11}
              color={tileCount === 14 ? theme.primary : '#B91C1C'}
            />
            <Text style={{ color: tileCount === 14 ? theme.primary : '#B91C1C', fontSize: 11, fontWeight: '800' }}>
              {tileCount} tiles
            </Text>
          </View>
          {pattern.concealed ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: theme.accent + '1A',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
              }}
            >
              <Ionicons name="lock-closed" size={10} color={theme.accentText} />
              <Text style={{ color: theme.accentText, fontSize: 10, fontWeight: '800' }}>CONC</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Tile visualization */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 3, paddingTop: 12, paddingBottom: 2 }}
      >
        {sortMode === 'rank' ? (
          sortedTiles.map((t, i) => (
            <Tile key={i} suit={t.suit} value={t.value} size="xs" />
          ))
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {pattern.groups.map((g, gi) => {
              const idx = g.match.kind === 'anySuit' ? anyCounter++ : 0;
              return (
                <View key={gi} style={{ alignItems: 'center', gap: 4 }}>
                  <HandGroupBlock group={g} anySuitIndex={idx} />
                  <Text style={{ color: theme.textSubtle, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 }}>
                    {COUNT_LABEL[g.count] ?? `${g.count}`}
                    {g.jokersAllowed ? ' · J' : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Card>
  );
}

export function CardReference({ year = CURRENT_CARD_YEAR }: { year?: number }) {
  const { theme } = useTheme();
  const card = useMemo(() => getYearCard(year), [year]);
  const [sortMode, setSortMode] = useState<SortMode>('suit');

  const categories = useMemo(() => {
    const present: CategoryKey[] = [];
    for (const p of card) {
      if (!present.includes(p.category)) present.push(p.category);
    }
    return present;
  }, [card]);

  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'all'>('all');

  const visible = useMemo(
    () => (activeCategory === 'all' ? card : card.filter((p) => p.category === activeCategory)),
    [card, activeCategory],
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}
        style={{ flexGrow: 0 }}
      >
        <FilterChip
          label="All"
          active={activeCategory === 'all'}
          onPress={() => setActiveCategory('all')}
        />
        {categories.map((c) => (
          <FilterChip
            key={c}
            label={CATEGORY_META[c]?.label ?? c}
            active={activeCategory === c}
            onPress={() => setActiveCategory(c)}
          />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8 }}>
        <TileSortControls mode={sortMode} onChange={setSortMode} compact />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ color: theme.textSubtle, fontSize: 12, fontWeight: '700' }}>
            {visible.length} hand{visible.length === 1 ? '' : 's'}
          </Text>
          {activeCategory !== 'all' ? (
            <Badge label={CATEGORY_META[activeCategory]?.label ?? String(activeCategory)} tone={CATEGORY_META[activeCategory]?.tone ?? 'neutral'} />
          ) : null}
        </View>

        <Text style={{ color: theme.textSubtle, fontSize: 11, lineHeight: 16, marginBottom: 14 }}>
          F = Flower · B/C/D = Bam/Crak/Dot · "J" means jokers are allowed in that group. Pairs and
          singles never accept jokers.
        </Text>

        {visible.map((p) => (
          <HandRow key={p.id} pattern={p} sortMode={sortMode} />
        ))}

        {visible.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="albums-outline" size={32} color={theme.textSubtle} />
            <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 8 }}>
              No hands in this category yet.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? theme.text : theme.surface,
        borderWidth: 1,
        borderColor: active ? theme.text : theme.border,
      }}
    >
      <Text style={{ color: active ? theme.bg : theme.text, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

export default CardReference;
