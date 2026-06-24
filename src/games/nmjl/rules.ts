// NMJL (National Mah Jongg League) rule engine
// Handles yearly card updates, joker rules, and hand validation.

export type Suit = "bam" | "crak" | "dot" | "wind" | "dragon" | "flower" | "joker";
export type Tile = {
  id: string;
  suit: Suit;
  value: string; // "1"-"9", "E"/"S"/"W"/"N", "R"/"G"/"Wh", "F", "J"
};

export type HandCategory =
  | "2025"
  | "2468"
  | "ANY_LIKE_NUMBERS"
  | "ADDITION"
  | "QUINTS"
  | "CONSECUTIVE_RUN"
  | "13579"
  | "WINDS_DRAGONS"
  | "369"
  | "SINGLES_PAIRS";

export type HandGroup = {
  // pung=3, kong=4, quint=5, sextet=6, pair=2, single=1
  count: 1 | 2 | 3 | 4 | 5 | 6;
  // What tile this group must be — concrete suit/value or symbolic.
  match: TileMatcher;
  // Whether jokers are allowed to substitute in this group.
  // NMJL rule: jokers are NOT allowed in pairs or singles.
  jokersAllowed: boolean;
};

export type TileMatcher =
  | { kind: "exact"; suit: Suit; value: string }
  | { kind: "anySuit"; value: string } // same value, any of the 3 number suits
  | { kind: "wind"; value: "E" | "S" | "W" | "N" }
  | { kind: "dragon"; value: "R" | "G" | "Wh" }
  | { kind: "flower" };

export type HandPattern = {
  id: string;
  year: number;
  category: HandCategory;
  description: string;
  // Points awarded if the hand is won.
  points: number;
  // Whether the hand must be concealed (no exposures from discards).
  concealed: boolean;
  // Ordered list of groups that compose the 14-tile hand.
  groups: HandGroup[];
};

// Year-keyed registry — supports yearly NMJL card updates.
const HAND_REGISTRY: Record<number, HandPattern[]> = {};

export function registerYearCard(year: number, patterns: HandPattern[]) {
  HAND_REGISTRY[year] = patterns;
}

export function getYearCard(year: number): HandPattern[] {
  return HAND_REGISTRY[year] ?? [];
}

export function availableYears(): number[] {
  return Object.keys(HAND_REGISTRY).map((y) => Number(y)).sort();
}

// ---- Tile helpers ----

export function isJoker(tile: Tile): boolean {
  return tile.suit === "joker";
}

export function isFlower(tile: Tile): boolean {
  return tile.suit === "flower";
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

export function matchesMatcher(tile: Tile, m: TileMatcher): boolean {
  if (isJoker(tile)) return false; // joker handled separately
  switch (m.kind) {
    case "exact":
      return tile.suit === m.suit && tile.value === m.value;
    case "anySuit":
      return (
        (tile.suit === "bam" || tile.suit === "crak" || tile.suit === "dot") &&
        tile.value === m.value
      );
    case "wind":
      return tile.suit === "wind" && tile.value === m.value;
    case "dragon":
      return tile.suit === "dragon" && tile.value === m.value;
    case "flower":
      return tile.suit === "flower";
  }
}

// ---- Joker swap rules ----
// NMJL: a player may swap a real tile from their hand for a joker
// already exposed in any player's exposed group, but only if:
//   - the swap completes/doesn't break that group
//   - jokers are allowed in that group (i.e. count >= 3)
//   - the real tile matches the matcher of that group
export type ExposedGroup = {
  ownerId: string;
  group: HandGroup;
  tiles: Tile[]; // currently in the exposure
};

export function canSwapJoker(
  realTile: Tile,
  exposed: ExposedGroup,
): { ok: boolean; reason?: string } {
  if (isJoker(realTile)) return { ok: false, reason: "Cannot swap a joker for a joker" };
  if (!exposed.group.jokersAllowed) {
    return { ok: false, reason: "Group does not allow jokers (pair/single)" };
  }
  const hasJoker = exposed.tiles.some(isJoker);
  if (!hasJoker) return { ok: false, reason: "No joker in exposed group" };
  if (!matchesMatcher(realTile, exposed.group.match)) {
    return { ok: false, reason: "Tile does not match group" };
  }
  return { ok: true };
}

export function performJokerSwap(
  realTile: Tile,
  exposed: ExposedGroup,
): { tiles: Tile[]; joker: Tile } | null {
  const check = canSwapJoker(realTile, exposed);
  if (!check.ok) return null;
  const idx = exposed.tiles.findIndex(isJoker);
  if (idx < 0) return null;
  const joker = exposed.tiles[idx];
  const newTiles = exposed.tiles.slice();
  newTiles[idx] = realTile;
  return { tiles: newTiles, joker };
}

// ---- Hand validation ----

export type ValidationResult = {
  valid: boolean;
  pattern?: HandPattern;
  points?: number;
  reason?: string;
};

// Try to assign 14 tiles to a pattern's groups in order, allowing joker substitution
// in groups where jokersAllowed === true. Single-suit lines (patterns containing
// any "anySuit" group) must use ONE suit across ALL anySuit groups per NMJL rules,
// so we try each of bam/crak/dot as the global suit.
function tryMatchPattern(tiles: Tile[], pattern: HandPattern): boolean {
  if (tiles.length !== sumGroupCounts(pattern)) return false;
  const numSuits: Suit[] = ["bam", "crak", "dot"];
  const hasAnySuit = pattern.groups.some((g) => g.match.kind === "anySuit");
  const suitChoices: (Suit | null)[] = hasAnySuit ? numSuits : [null];
  return suitChoices.some((suit) => tryMatchPatternWithSuit(tiles, pattern, suit));
}

function tryMatchPatternWithSuit(
  tiles: Tile[],
  pattern: HandPattern,
  globalSuit: Suit | null,
): boolean {
  const used = new Array<boolean>(tiles.length).fill(false);

  function assignGroup(gi: number): boolean {
    if (gi >= pattern.groups.length) {
      return used.every(Boolean);
    }
    const g = pattern.groups[gi];
    const lockedMatcher: TileMatcher =
      g.match.kind === "anySuit" && globalSuit
        ? { kind: "exact", suit: globalSuit, value: g.match.value }
        : g.match;
    const indices: number[] = [];
    for (let i = 0; i < tiles.length; i++) {
      if (used[i]) continue;
      const t = tiles[i];
      if (isJoker(t)) continue;
      if (matchesMatcher(t, lockedMatcher)) indices.push(i);
    }
    const jokerIndices: number[] = [];
    for (let i = 0; i < tiles.length; i++) {
      if (!used[i] && isJoker(tiles[i])) jokerIndices.push(i);
    }

    const need = g.count;
    const realPick = Math.min(indices.length, need);
    const jokersNeeded = need - realPick;
    if (jokersNeeded > 0 && !g.jokersAllowed) return false;
    if (jokersNeeded > jokerIndices.length) return false;

    const picked = indices.slice(0, realPick).concat(jokerIndices.slice(0, jokersNeeded));
    picked.forEach((i) => (used[i] = true));
    if (assignGroup(gi + 1)) return true;
    picked.forEach((i) => (used[i] = false));
    return false;
  }

  return assignGroup(0);
}

function sumGroupCounts(p: HandPattern): number {
  return p.groups.reduce((s, g) => s + g.count, 0);
}

export function validateHand(
  tiles: Tile[],
  year: number,
): ValidationResult {
  const card = getYearCard(year);
  if (card.length === 0) {
    return { valid: false, reason: `No NMJL card loaded for ${year}` };
  }
  if (tiles.length !== 14) {
    return { valid: false, reason: `Hand must have 14 tiles (got ${tiles.length})` };
  }
  let best: HandPattern | undefined;
  for (const pattern of card) {
    if (tryMatchPattern(tiles, pattern)) {
      if (!best || pattern.points > best.points) best = pattern;
    }
  }
  if (best) return { valid: true, pattern: best, points: best.points };
  return { valid: false, reason: "Tiles do not match any hand on the current card" };
}

// ---- Helpers for building groups ----
export const G = {
  pung: (m: TileMatcher): HandGroup => ({ count: 3, match: m, jokersAllowed: true }),
  kong: (m: TileMatcher): HandGroup => ({ count: 4, match: m, jokersAllowed: true }),
  quint: (m: TileMatcher): HandGroup => ({ count: 5, match: m, jokersAllowed: true }),
  sextet: (m: TileMatcher): HandGroup => ({ count: 6, match: m, jokersAllowed: true }),
  pair: (m: TileMatcher): HandGroup => ({ count: 2, match: m, jokersAllowed: false }),
  single: (m: TileMatcher): HandGroup => ({ count: 1, match: m, jokersAllowed: false }),
};

export const M = {
  exact: (suit: Suit, value: string): TileMatcher => ({ kind: "exact", suit, value }),
  any: (value: string): TileMatcher => ({ kind: "anySuit", value }),
  wind: (v: "E" | "S" | "W" | "N"): TileMatcher => ({ kind: "wind", value: v }),
  dragon: (v: "R" | "G" | "Wh"): TileMatcher => ({ kind: "dragon", value: v }),
  flower: (): TileMatcher => ({ kind: "flower" }),
};
