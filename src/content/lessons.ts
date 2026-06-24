// Lesson catalog for the 3-tier American Mahjong (NMJL) curriculum.
// Each lesson is fully self-contained — title, summary, and ordered steps
// with optional tile demos rendered by the lesson screen.

import type { TileSpec } from '@/src/components/Tile';

export type LessonTier = 'beginner' | 'intermediate' | 'advanced';

export type LessonStep = {
  title: string;
  body: string;
  tiles?: TileSpec[];
  highlight?: number[]; // indexes of tiles to highlight
  callout?: string; // small accent note
};

export type Lesson = {
  id: string;
  tier: LessonTier;
  title: string;
  summary: string;
  duration: string;
  steps: LessonStep[];
};

export const LESSONS: Lesson[] = [
  // ─────────── BEGINNER ───────────
  {
    id: 'tiles-101',
    tier: 'beginner',
    title: 'Meet the Tiles',
    summary: 'The 152 tiles of American Mahjong: suits, honors, flowers, jokers.',
    duration: '4 min',
    steps: [
      {
        title: 'Three numbered suits',
        body: 'Bams (Bamboos, green), Craks (Characters, red), and Dots (Circles, blue). Each suit runs 1 through 9, four copies of each tile.',
        tiles: [
          { suit: 'bam', value: '3' },
          { suit: 'crak', value: '5' },
          { suit: 'dot', value: '7' },
        ],
      },
      {
        title: 'The four winds',
        body: 'North, East, South, West. They appear in winds-and-dragons hands and pair with their matching dragon color.',
        tiles: [
          { suit: 'wind', value: 'N' },
          { suit: 'wind', value: 'E' },
          { suit: 'wind', value: 'S' },
          { suit: 'wind', value: 'W' },
        ],
      },
      {
        title: 'Three dragons',
        body: 'Red (中), Green (發), and White Soap (白). White Soap also acts as the "zero" in some hands.',
        tiles: [
          { suit: 'dragon', value: 'R' },
          { suit: 'dragon', value: 'G' },
          { suit: 'dragon', value: 'Wh' },
        ],
      },
      {
        title: 'Flowers & Jokers',
        body: 'Eight flowers (interchangeable, gold accent) and eight jokers — wild for any group of 3+ identical tiles, but never for pairs or singles.',
        tiles: [
          { suit: 'flower' },
          { suit: 'flower' },
          { suit: 'joker' },
          { suit: 'joker' },
        ],
        callout: 'Jokers cannot be used in pairs — remember this!',
      },
    ],
  },
  {
    id: 'nmjl-card',
    tier: 'beginner',
    title: 'Reading the NMJL Card',
    summary: 'Sections, line numbers, the C/X marker, and point values.',
    duration: '5 min',
    steps: [
      {
        title: 'Sections by theme',
        body: 'Each year the card groups hands into sections. The 2026 card has: 2026 (year), 2468, Any Like Numbers, Quints, Consecutive Run, 13579, Winds & Dragons, 369, Singles & Pairs.',
      },
      {
        title: 'Concealed vs Exposed',
        body: 'A "C" badge means the hand must stay fully concealed — no calls allowed. An "X" means you can expose pungs/kongs by calling discards.',
      },
      {
        title: 'Point values',
        body: 'Easier hands score 25. Harder hands climb to 30, 35, 40, 50, even 75 for Singles & Pairs. Concealed hands double their value.',
      },
    ],
  },
  {
    id: 'charleston',
    tier: 'beginner',
    title: 'The Charleston',
    summary: '3 right, 3 across, 3 left — and the optional courtesy.',
    duration: '4 min',
    steps: [
      {
        title: 'First Charleston',
        body: 'Pass 3 tiles right, 3 across, 3 left. You may include up to 3 jokers... wait — never! Jokers stay home until after the deal is settled.',
        callout: 'Never pass jokers in the Charleston.',
      },
      {
        title: 'Second Charleston',
        body: 'Pass 3 left, 3 across, 3 right. Either Charleston can be stopped by unanimous agreement after across.',
      },
      {
        title: 'Courtesy pass',
        body: 'Optional last step: each pair of players across may swap 0, 1, 2, or 3 tiles by mutual agreement.',
      },
    ],
  },
  {
    id: 'turn-flow',
    tier: 'beginner',
    title: 'A Turn, Step by Step',
    summary: 'Draw, decide, discard — and the calling rules.',
    duration: '4 min',
    steps: [
      {
        title: 'Your turn',
        body: 'Draw one tile from the wall. Decide what to keep. Discard one tile face-up and call its name.',
      },
      {
        title: 'Calling discards',
        body: 'Any player may call the just-discarded tile to complete a pung (3), kong (4), or quint (5). Calls jump the turn order — play resumes from the caller.',
      },
      {
        title: 'Mahjong!',
        body: 'When your hand exactly matches a card line — call "Mahjong" and expose the full hand for verification.',
      },
    ],
  },
  {
    id: 'concealed-vs-exposed',
    tier: 'beginner',
    title: 'Concealed vs Exposed Hands',
    summary: 'When to keep tiles secret and when to call.',
    duration: '3 min',
    steps: [
      {
        title: 'Why concealed pays more',
        body: 'Concealed hands double their printed value. They are harder — you cannot call discards — but the payoff is worth it on flexible hands.',
      },
      {
        title: 'When to expose',
        body: 'If a hand line allows exposures (X marker) and you are missing only one or two tiles in a pung/kong, calling speeds you up dramatically.',
      },
    ],
  },

  // ─────────── INTERMEDIATE ───────────
  {
    id: 'reading-lines',
    tier: 'intermediate',
    title: 'Decoding Card Lines',
    summary: 'FFFF 2026 NEWS — translating shorthand into tiles.',
    duration: '6 min',
    steps: [
      {
        title: 'FF and NEWS',
        body: 'FF = a pair of flowers. FFFF = a kong of flowers. NEWS = one of each wind, in any order.',
        tiles: [
          { suit: 'flower' },
          { suit: 'flower' },
          { suit: 'wind', value: 'N' },
          { suit: 'wind', value: 'E' },
          { suit: 'wind', value: 'S' },
          { suit: 'wind', value: 'W' },
        ],
      },
      {
        title: 'Number shorthand',
        body: 'Single digits = singles. Doubled = pair. Tripled = pung. Quadrupled = kong. The line "222 4444 6666 88" means pung-kong-kong-pair.',
      },
      {
        title: 'Suit constraints',
        body: 'Tiles printed in the same color must be the same suit. Different colors mean different suits — always check.',
      },
    ],
  },
  {
    id: 'jokers-swaps',
    tier: 'intermediate',
    title: 'Jokers & Joker Swaps',
    summary: 'Wild rules, redemption, and the swap shortcut.',
    duration: '5 min',
    steps: [
      {
        title: 'When jokers are wild',
        body: 'Inside any group of 3 or more identical tiles (pung, kong, quint, sextet) — yours or an opponent\'s exposure.',
        tiles: [
          { suit: 'joker' },
          { suit: 'crak', value: '4' },
          { suit: 'crak', value: '4' },
        ],
      },
      {
        title: 'The Joker Swap',
        body: 'On your turn, if any player has a joker exposed, you can give them the real tile it represents and take the joker into your hand.',
        callout: 'Swaps happen on your turn only, before you discard.',
      },
      {
        title: 'No jokers in pairs',
        body: 'Singles and Pairs hands forbid jokers entirely. A pair must always be two real, identical tiles.',
      },
    ],
  },
  {
    id: 'exposures',
    tier: 'intermediate',
    title: 'Calling & Exposing',
    summary: 'Pungs, kongs, quints — when to call and what changes.',
    duration: '5 min',
    steps: [
      {
        title: 'Calling for pung',
        body: 'You hold a pair, someone discards the third — call "pung", expose all three face-up to the right.',
        tiles: [
          { suit: 'dot', value: '6' },
          { suit: 'dot', value: '6' },
          { suit: 'dot', value: '6' },
        ],
      },
      {
        title: 'Promoting to kong',
        body: 'After exposing a pung, if you draw the 4th matching tile, promote the pung to a kong by sliding it in.',
      },
      {
        title: 'Locked-in line',
        body: 'Once you expose, you are committed — you must finish a hand line consistent with the exposure or risk a dead hand.',
      },
    ],
  },
  {
    id: 'dead-hands',
    tier: 'intermediate',
    title: 'Dead Hands',
    summary: 'How they happen, how to avoid them.',
    duration: '4 min',
    steps: [
      {
        title: 'What makes a hand dead',
        body: 'Impossible to complete any card line — usually from over-exposing or losing a key tile. A dead hand cannot win.',
      },
      {
        title: 'Stay flexible',
        body: 'Track at least two viable card lines until you have committed multiple exposures. Watch the discards for blockers.',
      },
    ],
  },
  {
    id: 'scoring',
    tier: 'intermediate',
    title: 'Scoring Basics',
    summary: '25 to 75 points, doubles, and the bonus structure.',
    duration: '4 min',
    steps: [
      {
        title: 'Base values',
        body: '25, 30, 35, 40, 50, 75 — printed on each line. Concealed hands double. Self-drawn winning tile doubles again.',
      },
      {
        title: 'Who pays what',
        body: 'If you mahjong on a discard, the discarder pays double. The other two pay the base. Self-draw: everyone pays double.',
      },
    ],
  },

  // ─────────── ADVANCED ───────────
  {
    id: 'defense',
    tier: 'advanced',
    title: 'Defensive Discarding',
    summary: 'Read exposures, count tiles, never feed mahjong.',
    duration: '7 min',
    steps: [
      {
        title: 'Read every exposure',
        body: 'When an opponent exposes 222 craks, narrow their possible hands to lines containing pung-of-2-craks. Discard tiles that can\'t complete those.',
      },
      {
        title: 'Late-game discards',
        body: 'In the last 10 tiles of the wall, prefer discarding tiles already discarded — they can\'t be the winning tile (unless the caller already has 3).',
      },
      {
        title: 'The dangerous discard',
        body: 'A tile that has not been seen and that fits multiple visible exposures is the most dangerous. Hold it if you have a safe alternative.',
      },
    ],
  },
  {
    id: 'hand-switching',
    tier: 'advanced',
    title: 'Hand Switching',
    summary: 'Knowing when to abandon a target hand for a better one.',
    duration: '6 min',
    steps: [
      {
        title: 'Cost-benefit at draw 8',
        body: 'By the 8th draw, count tiles needed for your primary line. If 4+ are still needed and the wall is half gone, look at adjacent lines.',
      },
      {
        title: 'Pivot tiles',
        body: 'Tiles that fit multiple lines (e.g. a single 5-bam slotting into 2024-Year and Consecutive Run) are pivot tiles — keep them.',
      },
    ],
  },
  {
    id: 'probability',
    tier: 'advanced',
    title: 'Probability & The Wall',
    summary: 'Counting outs, expected jokers, and wall depth.',
    duration: '6 min',
    steps: [
      {
        title: 'Counting outs',
        body: 'For any needed tile: 4 copies exist. Subtract those visible (yours, exposed, discarded). What remains is in the wall or opponents\' hands.',
      },
      {
        title: 'Joker math',
        body: '8 jokers. After Charleston, on average 2 jokers reach each player. Track them — if 6 are exposed and you hold 1, only 1 remains hidden.',
      },
    ],
  },
  {
    id: 'singles-pairs',
    tier: 'advanced',
    title: 'Singles & Pairs Hands',
    summary: 'No jokers, all real tiles — the highest scoring section.',
    duration: '5 min',
    steps: [
      {
        title: 'Why 75 points',
        body: 'Pure singles and pairs — no pungs to lean on, no jokers allowed. The hardest section on the card, hence the top score.',
      },
      {
        title: 'When to commit',
        body: 'Only when your starting tiles already contain 5+ scoring pairs and you hold zero jokers. Otherwise pass on it.',
      },
    ],
  },
  {
    id: 'special-hands',
    tier: 'advanced',
    title: 'Year, Run, Like, Quints',
    summary: 'The signature NMJL hand families.',
    duration: '6 min',
    steps: [
      {
        title: 'Year hand',
        body: 'Built from the current year\'s digits (e.g., 2-0-2-5). Often includes FFFF and NEWS. Refreshes every April with the new card.',
      },
      {
        title: 'Consecutive Run',
        body: 'Three suits of consecutive numbers (e.g., 1-2-3 bam, 4-5-6 crak, 7-8-9 dot). Suits must be different across the three runs.',
      },
      {
        title: 'Like Numbers',
        body: 'Same number across all three suits — e.g., pung of 5-bam + pung of 5-crak + pung of 5-dot.',
      },
      {
        title: 'Quints',
        body: 'Five identical tiles. Requires at least 1 joker (only 4 real copies exist). High-value, high-risk.',
      },
    ],
  },
  {
    id: 'etiquette',
    tier: 'advanced',
    title: 'Table Etiquette',
    summary: 'The unspoken rules that keep games fast and friendly.',
    duration: '3 min',
    steps: [
      {
        title: 'Speed and silence',
        body: 'Discard within 5 seconds. Name each discard. Avoid commentary on others\' tiles or strategy.',
      },
      {
        title: 'Calling order',
        body: 'Mahjong beats kong beats pung. If two players call the same discard for different groups, mahjong wins.',
      },
    ],
  },
];

export const TIER_META: Record<LessonTier, { title: string; tone: 'jade' | 'gold' | 'red'; description: string }> = {
  beginner: {
    title: 'Beginner — Foundations',
    tone: 'jade',
    description: 'Tiles, the NMJL card, Charleston, turn flow, exposed vs concealed.',
  },
  intermediate: {
    title: 'Intermediate — Reading the Card',
    tone: 'gold',
    description: 'Jokers, swaps, exposures, dead hands, scoring.',
  },
  advanced: {
    title: 'Advanced — Strategy & Defense',
    tone: 'red',
    description: 'Probability, hand-switching, Singles & Pairs, etiquette.',
  },
};

export function getLessonsByTier(tier: LessonTier) {
  return LESSONS.filter((l) => l.tier === tier);
}

export function getLesson(id: string) {
  return LESSONS.find((l) => l.id === id);
}
