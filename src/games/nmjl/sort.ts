// Tile sorting + hand-size validation utilities.
//
// Sort orders are defined by the task spec:
//   Suit order:  Craks → Bams → Dots → Winds → Dragons → Flowers → Jokers
//   Rank order:  1-9 ascending → Winds E,S,W,N → Dragons R,G,W → Flowers → Jokers
//
// Both helpers operate on the minimal { suit, value } shape so they work for
// both RuleTile (gameplay) and TileSpec (static examples / card reference).

import type { TileSuit } from '@/src/components/Tile';

// Every completed / target NMJL hand must be exactly this many tiles.
export const TILES_PER_HAND = 14;

export type SortMode = 'rank' | 'suit';
export type SortableTile = { suit: TileSuit; value?: string };

// Suit sort: Craks, Bams, Dots, Winds, Dragons, Flowers, Jokers.
const SUIT_ORDER: Record<TileSuit, number> = {
  crak: 0,
  bam: 1,
  dot: 2,
  wind: 3,
  dragon: 4,
  flower: 5,
  joker: 6,
};

// Winds E,S,W,N  ·  Dragons R,G,W(h)
const WIND_ORDER: Record<string, number> = { E: 0, S: 1, W: 2, N: 3 };
const DRAGON_ORDER: Record<string, number> = { R: 0, G: 1, Wh: 2, W: 2 };

// Rank index used by BOTH sort modes:
//   numbered tiles 1-9 → 1..9
//   winds          → 10..13 (E,S,W,N)
//   dragons        → 14..16 (R,G,W)
//   flowers        → 17
//   jokers         → 18
function rankIndex(t: SortableTile): number {
  switch (t.suit) {
    case 'crak':
    case 'bam':
    case 'dot': {
      const n = parseInt(t.value ?? '0', 10);
      return Number.isFinite(n) ? n : 0;
    }
    case 'wind':
      return 10 + (WIND_ORDER[t.value ?? 'E'] ?? 0);
    case 'dragon':
      return 14 + (DRAGON_ORDER[t.value ?? 'R'] ?? 0);
    case 'flower':
      return 17;
    case 'joker':
      return 18;
    default:
      return 99;
  }
}

/**
 * Returns a NEW sorted array (never mutates the input).
 * - 'suit': primary = suit order, secondary = rank within suit.
 * - 'rank': primary = rank, secondary = suit order (so equal ranks group
 *           Crak→Bam→Dot).
 */
export function sortTiles<T extends SortableTile>(tiles: T[], mode: SortMode): T[] {
  const arr = [...tiles];
  if (mode === 'suit') {
    arr.sort((a, b) => {
      const s = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
      if (s !== 0) return s;
      return rankIndex(a) - rankIndex(b);
    });
  } else {
    arr.sort((a, b) => {
      const r = rankIndex(a) - rankIndex(b);
      if (r !== 0) return r;
      return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    });
  }
  return arr;
}

// ── Hand-size validation ──────────────────────────────────────────────

export function getGroupTileCount(groups: { count: number }[]): number {
  return groups.reduce((n, g) => n + g.count, 0);
}

export function isValidTargetHandSize(groups: { count: number }[]): boolean {
  return getGroupTileCount(groups) === TILES_PER_HAND;
}

/**
 * Dev-only guard. Logs a loud warning if any target hand does not contain
 * exactly 14 tiles. No-op in production builds.
 */
export function warnIfInvalidHandSize(
  id: string,
  groups: { count: number }[],
): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
  const count = getGroupTileCount(groups);
  if (count !== TILES_PER_HAND) {
    console.warn(
      `[NMJL] Target hand "${id}" has ${count} tiles — expected ${TILES_PER_HAND}. ` +
        `Fix the pattern definition; target hands must always be 14 tiles.`,
    );
  }
}

/**
 * Dev-only render guard for a concrete list of tiles (target hand / lesson
 * example). Logs a warning whenever a hand that is supposed to be complete is
 * rendered with anything other than 14 tiles. No-op in production.
 */
export function assertFullHand(label: string, tiles: { length: number }): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
  if (tiles.length !== TILES_PER_HAND) {
    console.warn(
      `[NMJL] "${label}" rendered ${tiles.length} tiles — expected ${TILES_PER_HAND}. ` +
        `Target hands and lesson examples must always show 14 tiles.`,
    );
  }
}
