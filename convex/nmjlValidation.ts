// ─────────────────────────────────────────────────────────────────────────
// SERVER-SIDE NMJL RULE ENGINE
//
// Validates legal hands, exposures, and joker usage according to NMJL
// standards. Operates on the authoritative engine's string tile codes so
// the server (never the client) decides whether a Mahjong is legal.
//
// Tile code format (matches convex/gameEngine.ts buildWall):
//   B1..B9  Bam      C1..C9  Crak     D1..D9  Dot
//   WE WS WW WN      Winds (East/South/West/North)
//   DR DG DWh        Dragons (Red/Green/White)
//   F1..F8           Flowers
//   J                Joker
// ─────────────────────────────────────────────────────────────────────────

export type NumSuit = "B" | "C" | "D";

export type Matcher =
  | { kind: "exact"; code: string }
  | { kind: "anySuit"; value: string } // same number, any of B/C/D — locks to ONE suit per group
  | { kind: "flower" };

export type Group = {
  count: number; // 1 single, 2 pair, 3 pung, 4 kong, 5 quint, 6 sextet
  match: Matcher;
  // NMJL: jokers allowed ONLY in groups of 3+. Never in pairs or singles.
  jokersAllowed: boolean;
};

export type Pattern = {
  id: string;
  description: string;
  points: number;
  concealed: boolean;
  groups: Group[];
};

const pung = (m: Matcher): Group => ({ count: 3, match: m, jokersAllowed: true });
const kong = (m: Matcher): Group => ({ count: 4, match: m, jokersAllowed: true });
const quint = (m: Matcher): Group => ({ count: 5, match: m, jokersAllowed: true });
const pair = (m: Matcher): Group => ({ count: 2, match: m, jokersAllowed: false });
const single = (m: Matcher): Group => ({ count: 1, match: m, jokersAllowed: false });
const exact = (code: string): Matcher => ({ kind: "exact", code });
const any = (value: string): Matcher => ({ kind: "anySuit", value });
const flower = (): Matcher => ({ kind: "flower" });

// NMJL 2025 — representative subset mirroring src/games/nmjl/cards/2025.ts.
const CARD_2025: Pattern[] = [
  {
    id: "2025-year-classic",
    description: "FF 2222 0000 2222 5555",
    points: 25,
    concealed: false,
    groups: [pair(flower()), kong(any("2")), kong(any("0")), kong(any("5"))],
  },
  {
    id: "2025-2468-pungs",
    description: "222 444 666 888 + DD",
    points: 25,
    concealed: false,
    groups: [pung(any("2")), pung(any("4")), pung(any("6")), pung(any("8")), pair(exact("DR"))],
  },
  {
    id: "2025-13579",
    description: "111 333 555 777 99",
    points: 25,
    concealed: false,
    groups: [pung(any("1")), pung(any("3")), pung(any("5")), pung(any("7")), pair(any("9"))],
  },
  {
    id: "2025-369",
    description: "333 666 999 + GGGG + WhWh",
    points: 25,
    concealed: false,
    groups: [
      pung(exact("B3")),
      pung(exact("C6")),
      pung(exact("D9")),
      kong(exact("DG")),
      pair(exact("DWh")),
    ],
  },
  {
    id: "2025-winds-dragons",
    description: "N E W S + RRR GGG WhWh Wh",
    points: 30,
    concealed: false,
    groups: [
      single(exact("WN")),
      single(exact("WE")),
      single(exact("WW")),
      single(exact("WS")),
      pung(exact("DR")),
      pung(exact("DG")),
      pung(exact("DWh")),
      pair(exact("DWh")),
    ],
  },
  {
    id: "2025-consec-run",
    description: "11 222 3333 4444",
    points: 25,
    concealed: false,
    groups: [pair(any("1")), pung(any("2")), kong(any("3")), kong(any("4"))],
  },
  {
    id: "2025-quints",
    description: "FF 11111 22222 33 (concealed)",
    points: 40,
    concealed: true,
    groups: [pair(flower()), quint(any("1")), quint(any("2")), pair(any("3"))],
  },
  {
    id: "2025-singles-pairs",
    description: "11 22 33 44 55 66 77 (concealed)",
    points: 50,
    concealed: true,
    groups: [
      pair(any("1")),
      pair(any("2")),
      pair(any("3")),
      pair(any("4")),
      pair(any("5")),
      pair(any("6")),
      pair(any("7")),
    ],
  },
];

const CARDS: Record<number, Pattern[]> = { 2025: CARD_2025 };

export function getCard(year: number): Pattern[] {
  return CARDS[year] ?? [];
}

// ---- tile helpers ----
export function isJoker(code: string): boolean {
  return code === "J";
}
export function isFlower(code: string): boolean {
  return code.startsWith("F");
}
function suitOf(code: string): NumSuit | null {
  const s = code[0];
  return s === "B" || s === "C" || s === "D" ? (s as NumSuit) : null;
}
function valueOf(code: string): string {
  return code.slice(1);
}

function matches(code: string, m: Matcher): boolean {
  if (isJoker(code)) return false;
  switch (m.kind) {
    case "exact":
      return code === m.code;
    case "anySuit": {
      const s = suitOf(code);
      return s !== null && valueOf(code) === m.value;
    }
    case "flower":
      return isFlower(code);
  }
}

function lockMatcher(m: Matcher, suit: NumSuit): Matcher {
  if (m.kind === "anySuit") {
    return { kind: "exact", code: `${suit}${m.value}` };
  }
  return m;
}

// Does a pattern contain any "anySuit" group? Such patterns are single-suit
// NMJL lines (e.g. 2468, 13579) — every anySuit group must share ONE suit.
function hasAnySuitGroup(p: Pattern): boolean {
  return p.groups.some((g) => g.match.kind === "anySuit");
}

function sumCounts(p: Pattern): number {
  return p.groups.reduce((n, g) => n + g.count, 0);
}

// Backtracking assignment of tiles to a pattern's groups, allowing joker
// substitution ONLY in groups of 3+ (jokersAllowed). For single-suit lines
// (patterns with anySuit groups) we lock EVERY anySuit group to one global
// suit, enforcing the NMJL one-suit rule.
function tryMatch(tiles: string[], pattern: Pattern): boolean {
  if (tiles.length !== sumCounts(pattern)) return false;
  // Single-suit lines: try each of B/C/D as the global suit. Otherwise the
  // pattern uses exact matchers, so suit choice is irrelevant (run once).
  const suits: NumSuit[] = hasAnySuitGroup(pattern) ? ["B", "C", "D"] : ["B"];
  return suits.some((suit) => tryMatchWithSuit(tiles, pattern, suit));
}

function tryMatchWithSuit(tiles: string[], pattern: Pattern, suit: NumSuit): boolean {
  const used = new Array<boolean>(tiles.length).fill(false);

  function assign(gi: number): boolean {
    if (gi >= pattern.groups.length) return used.every(Boolean);
    const g = pattern.groups[gi];
    const locked = lockMatcher(g.match, suit);
    const real: number[] = [];
    const jokers: number[] = [];
    for (let i = 0; i < tiles.length; i++) {
      if (used[i]) continue;
      if (isJoker(tiles[i])) jokers.push(i);
      else if (matches(tiles[i], locked)) real.push(i);
    }
    const realPick = Math.min(real.length, g.count);
    const jokersNeeded = g.count - realPick;
    if (jokersNeeded > 0 && !g.jokersAllowed) return false;
    if (jokersNeeded > jokers.length) return false;
    const picked = real.slice(0, realPick).concat(jokers.slice(0, jokersNeeded));
    picked.forEach((i) => (used[i] = true));
    if (assign(gi + 1)) return true;
    picked.forEach((i) => (used[i] = false));
    return false;
  }

  return assign(0);
}

export type ExposureCheck = { ok: boolean; reason?: string };

// Validate a single exposed group string (e.g. "B2-B2-J-B2") for legality.
export function validateExposure(exposure: string): ExposureCheck {
  const tiles = exposure.split("-").filter(Boolean);
  if (tiles.length < 3) {
    return { ok: false, reason: "Exposures must be pung (3) or larger" };
  }
  const jokerCount = tiles.filter(isJoker).length;
  const nonJoker = tiles.filter((t) => !isJoker(t));
  if (nonJoker.length === 0) {
    return { ok: false, reason: "Exposure cannot be all jokers" };
  }
  // All non-joker tiles in an exposure must be identical (pung/kong/quint).
  const first = nonJoker[0];
  if (!nonJoker.every((t) => t === first)) {
    return { ok: false, reason: "Mixed tiles in exposure are not a legal group" };
  }
  // NMJL: jokers legal only in groups of 3+ (always true here) but cannot
  // exceed the number of distinct copies — still legal up to group size.
  if (jokerCount >= tiles.length) {
    return { ok: false, reason: "Exposure cannot be all jokers" };
  }
  return { ok: true };
}

export type ValidationResult = {
  valid: boolean;
  patternId?: string;
  description?: string;
  points?: number;
  reason?: string;
};

// Validate a complete 14-tile hand (concealed hand tiles + exposed tiles
// flattened) against the year card.
export function validateWinningHand(
  handTiles: string[],
  exposedGroups: string[],
  year: number,
): ValidationResult {
  const card = getCard(year);
  if (card.length === 0) return { valid: false, reason: `No NMJL card for ${year}` };

  // Flatten exposures and validate each is a legal group first.
  const exposedTiles: string[] = [];
  let hasExposure = false;
  for (const g of exposedGroups) {
    const tiles = g.split("-").filter(Boolean);
    if (tiles.length === 0) continue;
    hasExposure = true;
    const check = validateExposure(g);
    if (!check.ok) return { valid: false, reason: check.reason };
    exposedTiles.push(...tiles);
  }

  const all = [...handTiles, ...exposedTiles];
  if (all.length !== 14) {
    return { valid: false, reason: `Hand must total 14 tiles (got ${all.length})` };
  }

  let best: Pattern | undefined;
  for (const pattern of card) {
    // Concealed hands cannot have any exposures from called discards.
    if (pattern.concealed && hasExposure) continue;
    if (tryMatch(all, pattern)) {
      if (!best || pattern.points > best.points) best = pattern;
    }
  }
  if (best) {
    return {
      valid: true,
      patternId: best.id,
      description: best.description,
      points: best.points,
    };
  }
  return { valid: false, reason: "Tiles do not match any hand on the current card" };
}
