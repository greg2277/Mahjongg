// NMJL (National Mah Jongg League) rule engine
// Handles yearly card updates, joker rules, and hand validation.

export type Suit = "bam" | "crak" | "dot" | "wind" | "dragon" | "flower" | "joker";
export type Tile = {
  id: string;
  suit: Suit;
  value: string; // "1"-"9", "E"/"S"/"W"/"N", "R"/"G"/"Wh", "F", "J"
};

export type HandCategory =
  | "2026"
  | "2468"
  | "ANY_LIKE_NUMBERS"
  | "ADDITION"
  | "QUINTS"
  | "CONSECUTIVE_RUN"
  | "13579"
  | "WINDS_DRAGONS"
  | "369"
  | "SINGLES_PAIRS";

export type TileMatcher =
  | { kind: "exact"; suit: Suit; value: string }
  | { kind: "anySuit"; value: string; suitSlot?: number } // same value, any of the 3 number suits
  | { kind: "wind"; value: "E" | "S" | "W" | "N" }
  | { kind: "dragon"; value: "R" | "G" | "Wh" }
  | { kind: "flower" }
  | { kind: "anyDragon" }               // any of DR/DG/DWh
  | { kind: "matchingDragon"; suitSlot?: number }  // dragon that matches the suit of its slot
  | { kind: "oppositeDragon"; suitSlot?: number }  // any dragon NOT matching the number suit
  | { kind: "consec"; offset: number; suitSlot?: number } // i-th tile in a consecutive run
  | { kind: "anyOf"; values: string[]; suitSlot?: number; lockKey?: string }; // number in a set; lockKey ties to shared value

export type HandGroup = {
  // pung=3, kong=4, quint=5, sextet=6, pair=2, single=1
  count: 1 | 2 | 3 | 4 | 5 | 6;
  // What tile this group must be — concrete suit/value or symbolic.
  match: TileMatcher;
  // Whether jokers are allowed to substitute in this group.
  // NMJL rule: jokers are NOT allowed in pairs or singles.
  jokersAllowed: boolean;
};

// suitMode: how many distinct suits the suit-slots must use
// "exactlyN": exactly N distinct suits across all slots
// "upToN": 1..N distinct suits allowed
export type SuitMode =
  | { type: "exactlyN"; n: number }
  | { type: "upToN"; n: number }
  | { type: "any" };  // no constraint (single-suit uses standard anySuit)

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
  // Consecutive run metadata: how long is the run? Starting tile is chosen 1..(9-length+1)
  consecutive?: { length: number };
  // Multi-suit mode
  suitMode?: SuitMode;
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

// NMJL suit -> matching dragon mapping
// Craks=Red(DR), Bams=Green(DG), Dots=White/Soap(DWh)
function matchingDragonValue(suit: Suit): "R" | "G" | "Wh" {
  if (suit === "crak") return "R";
  if (suit === "bam") return "G";
  return "Wh"; // dot -> White/Soap
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
    case "anyDragon":
      return tile.suit === "dragon";
    case "matchingDragon":
      // Will be resolved to exact during assignment — can't match without suit context
      return tile.suit === "dragon";
    case "oppositeDragon":
      // Will be resolved during assignment — can't match without suit context
      return tile.suit === "dragon";
    case "consec":
      // Will be resolved to exact during assignment
      return (
        (tile.suit === "bam" || tile.suit === "crak" || tile.suit === "dot")
      );
    case "anyOf":
      return (
        (tile.suit === "bam" || tile.suit === "crak" || tile.suit === "dot") &&
        m.values.includes(tile.value)
      );
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

// Resolve a TileMatcher to a concrete "exact" matcher given:
//  - chosenSuit: the suit chosen for this group's suitSlot (or global suit)
//  - consecStart: the starting number of the consecutive run
//  - lockedValues: Record<lockKey, value> for anyOf shared locks
//  - allSuitSlots: map of suitSlot -> Suit (for matchingDragon/oppositeDragon resolution)
function resolveMatcher(
  m: TileMatcher,
  chosenSuit: Suit | null,
  consecStart: number | null,
  lockedValues: Record<string, string>,
  allSuitSlots: Record<number, Suit>,
): TileMatcher {
  switch (m.kind) {
    case "anySuit":
      if (chosenSuit) return { kind: "exact", suit: chosenSuit, value: m.value };
      return m;
    case "consec": {
      if (consecStart === null) return m;
      const val = String(consecStart + m.offset);
      if (chosenSuit) return { kind: "exact", suit: chosenSuit, value: val };
      return { kind: "anySuit", value: val };
    }
    case "anyOf": {
      let value: string | undefined;
      if (m.lockKey && lockedValues[m.lockKey] !== undefined) {
        value = lockedValues[m.lockKey];
      }
      if (value === undefined) return m; // will be locked during enumeration
      if (chosenSuit) return { kind: "exact", suit: chosenSuit, value };
      return { kind: "anySuit", value };
    }
    case "matchingDragon": {
      const slot = m.suitSlot ?? 0;
      const suit = allSuitSlots[slot] ?? chosenSuit;
      if (suit && (suit === "bam" || suit === "crak" || suit === "dot")) {
        return { kind: "dragon", value: matchingDragonValue(suit) };
      }
      return { kind: "anyDragon" };
    }
    case "oppositeDragon": {
      // We'll handle this as anyDragon for PERMISSIVE validation
      // SIMPLIFY: oppositeDragon is treated as anyDragon in validation
      return { kind: "anyDragon" };
    }
    default:
      return m;
  }
}

// Collect all suitSlots referenced in a pattern
function collectSuitSlots(pattern: HandPattern): Set<number> {
  const slots = new Set<number>();
  for (const g of pattern.groups) {
    const m = g.match;
    if (
      m.kind === "anySuit" ||
      m.kind === "consec" ||
      m.kind === "anyOf" ||
      m.kind === "matchingDragon" ||
      m.kind === "oppositeDragon"
    ) {
      const s = (m as { suitSlot?: number }).suitSlot;
      if (s !== undefined) slots.add(s);
    }
  }
  return slots;
}

// Does the pattern use explicit suit slots?
function hasExplicitSuitSlots(pattern: HandPattern): boolean {
  return collectSuitSlots(pattern).size > 0;
}

// Does the pattern have anySuit without explicit slots (legacy single-suit)?
function hasLegacyAnySuit(pattern: HandPattern): boolean {
  return pattern.groups.some(
    (g) => g.match.kind === "anySuit" && (g.match as { suitSlot?: number }).suitSlot === undefined,
  );
}

// Does the pattern use consecutive runs?
function hasConsec(pattern: HandPattern): boolean {
  return pattern.groups.some((g) => g.match.kind === "consec");
}

// Does the pattern use anyOf?
function hasAnyOf(pattern: HandPattern): boolean {
  return pattern.groups.some((g) => g.match.kind === "anyOf");
}

const NUM_SUITS: Suit[] = ["bam", "crak", "dot"];

// Generate all combinations of k items from arr
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// Generate all assignments of suits to slots (possibly with constraints)
function enumSuitAssignments(
  slots: number[],
  suitMode: SuitMode,
): Record<number, Suit>[] {
  // Each slot picks from NUM_SUITS
  const results: Record<number, Suit>[] = [];

  function recurse(idx: number, current: Record<number, Suit>) {
    if (idx === slots.length) {
      // Check suit mode constraint
      const chosenSuits = Object.values(current);
      const distinctCount = new Set(chosenSuits).size;
      if (suitMode.type === "exactlyN" && distinctCount !== suitMode.n) return;
      if (suitMode.type === "upToN" && distinctCount > suitMode.n) return;
      results.push({ ...current });
      return;
    }
    const slot = slots[idx];
    for (const suit of NUM_SUITS) {
      current[slot] = suit;
      recurse(idx + 1, current);
    }
    delete current[slot];
  }

  recurse(0, {});
  return results;
}

// Enumerate anyOf lock combinations
function enumAnyOfLocks(pattern: HandPattern): Record<string, string>[] {
  // Collect all unique lockKeys and their possible values
  const keyValues: Record<string, string[]> = {};
  for (const g of pattern.groups) {
    if (g.match.kind === "anyOf" && g.match.lockKey) {
      const lk = g.match.lockKey;
      if (!keyValues[lk]) keyValues[lk] = g.match.values;
    }
  }
  const keys = Object.keys(keyValues);
  if (keys.length === 0) return [{}];

  const results: Record<string, string>[] = [];
  function recurse(idx: number, current: Record<string, string>) {
    if (idx === keys.length) {
      results.push({ ...current });
      return;
    }
    const key = keys[idx];
    for (const v of keyValues[key]) {
      current[key] = v;
      recurse(idx + 1, current);
    }
    delete current[key];
  }
  recurse(0, {});
  return results;
}

// Try to assign 14 tiles to a pattern's groups in order, allowing joker substitution
// in groups where jokersAllowed === true.
function tryMatchPattern(tiles: Tile[], pattern: HandPattern): boolean {
  if (tiles.length !== sumGroupCounts(pattern)) return false;

  // --- Determine enumeration strategy ---

  // Case 1: explicit suit slots (multi-suit hands)
  if (hasExplicitSuitSlots(pattern)) {
    const slotSet = collectSuitSlots(pattern);
    const slots = Array.from(slotSet).sort();
    const suitMode = pattern.suitMode ?? { type: "any" };
    const suitAssignments = enumSuitAssignments(slots, suitMode);

    // Consecutive run?
    const consecLen = pattern.consecutive?.length ?? null;
    const consecStarts = consecLen !== null
      ? Array.from({ length: 9 - consecLen + 1 }, (_, i) => i + 1)
      : [null];

    // AnyOf locks?
    const anyOfLocks = enumAnyOfLocks(pattern);

    for (const suitAssign of suitAssignments) {
      for (const cs of consecStarts) {
        for (const locks of anyOfLocks) {
          if (tryMatchWithResolved(tiles, pattern, suitAssign, cs, locks)) return true;
        }
      }
    }
    return false;
  }

  // Case 2: legacy single-suit (anySuit without suitSlot)
  if (hasLegacyAnySuit(pattern)) {
    const consecLen = pattern.consecutive?.length ?? null;
    const consecStarts = consecLen !== null
      ? Array.from({ length: 9 - consecLen + 1 }, (_, i) => i + 1)
      : [null];
    const anyOfLocks = enumAnyOfLocks(pattern);

    for (const suit of NUM_SUITS) {
      for (const cs of consecStarts) {
        for (const locks of anyOfLocks) {
          const suitAssign: Record<number, Suit> = {};
          if (tryMatchWithResolved(tiles, pattern, suitAssign, cs, locks, suit)) return true;
        }
      }
    }
    return false;
  }

  // Case 3: only consec (no anySuit) — e.g. any suit consec encoded as exact
  if (hasConsec(pattern)) {
    const consecLen = pattern.consecutive?.length ?? 3;
    const consecStarts = Array.from({ length: 9 - consecLen + 1 }, (_, i) => i + 1);
    for (const suit of NUM_SUITS) {
      for (const cs of consecStarts) {
        if (tryMatchWithResolved(tiles, pattern, {}, cs, {}, suit)) return true;
      }
    }
    return false;
  }

  // Case 4: anyOf without slots (shouldn't happen but handle gracefully)
  if (hasAnyOf(pattern)) {
    const anyOfLocks = enumAnyOfLocks(pattern);
    for (const locks of anyOfLocks) {
      if (tryMatchWithResolved(tiles, pattern, {}, null, locks)) return true;
    }
    return false;
  }

  // Case 5: pure exact/wind/dragon/flower — run once
  return tryMatchWithResolved(tiles, pattern, {}, null, {});
}

function tryMatchWithResolved(
  tiles: Tile[],
  pattern: HandPattern,
  suitSlots: Record<number, Suit>,
  consecStart: number | null,
  lockedValues: Record<string, string>,
  globalSuit?: Suit,
): boolean {
  const used = new Array<boolean>(tiles.length).fill(false);

  function assignGroup(gi: number): boolean {
    if (gi >= pattern.groups.length) {
      return used.every(Boolean);
    }
    const g = pattern.groups[gi];
    const m = g.match;

    // Determine the suit for this group
    let groupSuit: Suit | null = null;
    if (m.kind === "anySuit" || m.kind === "consec" || m.kind === "anyOf") {
      const slotKey = (m as { suitSlot?: number }).suitSlot;
      if (slotKey !== undefined && suitSlots[slotKey] !== undefined) {
        groupSuit = suitSlots[slotKey];
      } else if (globalSuit) {
        groupSuit = globalSuit;
      }
    }

    const resolved = resolveMatcher(m, groupSuit, consecStart, lockedValues, suitSlots);

    // Handle anyOf without a lock: enumerate possible values
    if (m.kind === "anyOf" && !m.lockKey) {
      for (const val of m.values) {
        const lockedM: TileMatcher = groupSuit
          ? { kind: "exact", suit: groupSuit, value: val }
          : { kind: "anySuit", value: val };
        if (tryAssignGroupWithMatcher(gi, g, lockedM, assignGroup)) return true;
      }
      return false;
    }

    return tryAssignGroupWithMatcher(gi, g, resolved, assignGroup);
  }

  function tryAssignGroupWithMatcher(
    gi: number,
    g: HandGroup,
    lockedMatcher: TileMatcher,
    continueAssign: (gi: number) => boolean,
  ): boolean {
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
    if (continueAssign(gi + 1)) return true;
    picked.forEach((i) => (used[i] = false));
    return false;
  }

  return assignGroup(0);
}

export function sumGroupCounts(p: HandPattern): number {
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
  any: (value: string, suitSlot?: number): TileMatcher =>
    suitSlot !== undefined
      ? { kind: "anySuit", value, suitSlot }
      : { kind: "anySuit", value },
  wind: (v: "E" | "S" | "W" | "N"): TileMatcher => ({ kind: "wind", value: v }),
  dragon: (v: "R" | "G" | "Wh"): TileMatcher => ({ kind: "dragon", value: v }),
  flower: (): TileMatcher => ({ kind: "flower" }),
  anyDragon: (): TileMatcher => ({ kind: "anyDragon" }),
  matchingDragon: (suitSlot?: number): TileMatcher =>
    suitSlot !== undefined
      ? { kind: "matchingDragon", suitSlot }
      : { kind: "matchingDragon" },
  oppositeDragon: (suitSlot?: number): TileMatcher =>
    suitSlot !== undefined
      ? { kind: "oppositeDragon", suitSlot }
      : { kind: "oppositeDragon" },
  consec: (offset: number, suitSlot?: number): TileMatcher =>
    suitSlot !== undefined
      ? { kind: "consec", offset, suitSlot }
      : { kind: "consec", offset },
  anyOf: (values: string[], suitSlot?: number, lockKey?: string): TileMatcher => {
    const m: TileMatcher = { kind: "anyOf", values };
    if (suitSlot !== undefined) (m as { suitSlot?: number }).suitSlot = suitSlot;
    if (lockKey !== undefined) (m as { lockKey?: string }).lockKey = lockKey;
    return m;
  },
};
