// Hand Analysis — "closest pattern" engine.
//
// Given a player's tiles and the active NMJL year card, this computes how
// close the hand is to completing each legal pattern, and suggests which
// tiles are the safest to discard. It reuses the same matcher semantics as
// the rule engine (single-suit lines, joker substitution rules) so the
// guidance lines up with what validateHand() will actually accept.

import {
  getYearCard,
  isJoker,
  isFlower,
  matchesMatcher,
  type HandPattern,
  type HandGroup,
  type Suit,
  type TileMatcher,
  type Tile as RuleTile,
} from '@/src/games/nmjl';

export type PatternProgress = {
  pattern: HandPattern;
  matched: number; // tiles already contributing
  total: number; // tiles required (always 14 for a full hand)
  percent: number; // 0..1
  usedTileIds: string[]; // ids of tiles contributing toward this pattern
  jokersUsed: number;
};

export type DiscardSuggestion = {
  tileId: string;
  reason: string;
  // Lower keep-score = safer to discard.
  keepScore: number;
};

const NUM_SUITS: Suit[] = ['bam', 'crak', 'dot'];

// Greedily assign tiles to a pattern's groups for a fixed global suit choice.
// Returns the set of contributing tile ids and joker count used. This is an
// approximation (greedy, order-sensitive) intended for guidance, not for the
// authoritative win check — validateHand() remains the source of truth.
function assignForSuit(
  tiles: RuleTile[],
  pattern: HandPattern,
  globalSuit: Suit | null,
): { usedTileIds: string[]; jokersUsed: number } {
  const used = new Array<boolean>(tiles.length).fill(false);
  const contributing: string[] = [];
  let jokersUsed = 0;

  // Sort groups so larger / non-joker groups are filled first — this gives a
  // more stable, generous progress estimate.
  const order = pattern.groups
    .map((g, i) => ({ g, i }))
    .sort((a, b) => b.g.count - a.g.count);

  for (const { g } of order) {
    const lockedMatcher: TileMatcher =
      g.match.kind === 'anySuit' && globalSuit
        ? { kind: 'exact', suit: globalSuit, value: g.match.value }
        : g.match;

    let filled = 0;
    // Real matching tiles first.
    for (let i = 0; i < tiles.length && filled < g.count; i++) {
      if (used[i]) continue;
      const t = tiles[i];
      if (isJoker(t)) continue;
      if (matchesMatcher(t, lockedMatcher)) {
        used[i] = true;
        contributing.push(t.id);
        filled++;
      }
    }
    // Only count jokers toward groups that allow them AND that already have a
    // real anchor tile (mirrors how a real hand develops). We still let jokers
    // fill empty allowed groups to reflect potential.
    if (filled < g.count && g.jokersAllowed) {
      for (let i = 0; i < tiles.length && filled < g.count; i++) {
        if (used[i]) continue;
        if (!isJoker(tiles[i])) continue;
        used[i] = true;
        contributing.push(tiles[i].id);
        jokersUsed++;
        filled++;
      }
    }
  }

  return { usedTileIds: contributing, jokersUsed };
}

function progressForPattern(tiles: RuleTile[], pattern: HandPattern): PatternProgress {
  const hasAnySuit = pattern.groups.some((g: HandGroup) => g.match.kind === 'anySuit');
  const suitChoices: (Suit | null)[] = hasAnySuit ? NUM_SUITS : [null];

  let best: { usedTileIds: string[]; jokersUsed: number } = { usedTileIds: [], jokersUsed: 0 };
  for (const suit of suitChoices) {
    const res = assignForSuit(tiles, pattern, suit);
    if (res.usedTileIds.length > best.usedTileIds.length) best = res;
  }

  const total = pattern.groups.reduce((s, g) => s + g.count, 0);
  const matched = best.usedTileIds.length;
  return {
    pattern,
    matched,
    total,
    percent: total > 0 ? matched / total : 0,
    usedTileIds: best.usedTileIds,
    jokersUsed: best.jokersUsed,
  };
}

// Returns every pattern ranked by how close the hand is to completing it.
export function analyzeHand(tiles: RuleTile[], year: number): PatternProgress[] {
  const card = getYearCard(year);
  if (card.length === 0) return [];
  return card
    .map((p) => progressForPattern(tiles, p))
    .sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      // Tie-break: fewer jokers needed (more real progress), then higher points.
      if (a.jokersUsed !== b.jokersUsed) return a.jokersUsed - b.jokersUsed;
      return b.pattern.points - a.pattern.points;
    });
}

// Convenience: the single closest pattern (or null for an empty card).
export function closestPattern(tiles: RuleTile[], year: number): PatternProgress | null {
  const ranked = analyzeHand(tiles, year);
  return ranked.length > 0 ? ranked[0] : null;
}

// Suggest which tiles are safest to discard. A tile's keep-score is how many
// of the top candidate patterns it contributes to; jokers and flowers get a
// large keep bonus so they are never recommended for discard.
export function suggestDiscards(
  tiles: RuleTile[],
  year: number,
  topN = 3,
): DiscardSuggestion[] {
  const ranked = analyzeHand(tiles, year).slice(0, topN);
  if (ranked.length === 0) return [];

  const contributeCount = new Map<string, number>();
  for (const prog of ranked) {
    for (const id of prog.usedTileIds) {
      contributeCount.set(id, (contributeCount.get(id) ?? 0) + 1);
    }
  }

  const suggestions: DiscardSuggestion[] = tiles.map((t) => {
    let keepScore = contributeCount.get(t.id) ?? 0;
    let reason: string;
    if (isJoker(t)) {
      keepScore += 100;
      reason = 'Never discard a Joker';
    } else if (isFlower(t)) {
      keepScore += 50;
      reason = 'Flowers score points — keep';
    } else if (keepScore > 0) {
      reason = `Builds toward ${keepScore} of your top hands`;
    } else {
      reason = 'Not used by your closest hands';
    }
    return { tileId: t.id, reason, keepScore };
  });

  return suggestions
    .filter((s) => !isJoker(byId(tiles, s.tileId)!) && !isFlower(byId(tiles, s.tileId)!))
    .sort((a, b) => a.keepScore - b.keepScore)
    .slice(0, 3);
}

function byId(tiles: RuleTile[], id: string): RuleTile | undefined {
  return tiles.find((t) => t.id === id);
}
