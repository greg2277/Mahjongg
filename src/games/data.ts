// Shared data + helpers for the 6 mini-games.
//
// All rounds in this file are validated against the NMJL 2026 card
// (see src/games/nmjl/cards/2026.ts) and standard American Mahjong
// rules. Every multiple-choice round has exactly ONE correct answer
// that is the only legal NMJL play; distractors are plausible but
// rule-violating, never ambiguous "could also be right" options.

import type { TileSpec, TileSuit } from '@/src/components/Tile';

// Tile factory helper. Declared at the very top of the module (function
// declaration => hoisted) so every round array below can call it safely
// regardless of evaluation order. Do NOT convert this to a const arrow
// function — that reintroduces a temporal-dead-zone crash.
function t(suit: TileSuit, value?: string): TileSpec {
  return { suit, value };
}

export type GameId =
  | 'first-look'
  | 'tile-match'
  | 'card-reader'
  | 'charleston'
  | 'hand-picker'
  | 'discard'
  | 'joker-swap';

export type GameMeta = {
  id: GameId;
  title: string;
  tag: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  gradient: readonly [string, string];
  rounds: number;
  xpPerCorrect: number;
};

export const GAMES: Record<GameId, GameMeta> = {
  'first-look': {
    id: 'first-look',
    title: 'First Look: Mahjong 101',
    tag: 'Beginner',
    description: 'Never seen mahjong before? Start here. Learn the tiles, the goal, and the basic flow with simple yes/no questions.',
    gradient: ['#0EA5E9', '#0369A1'] as const,
    rounds: 12,
    xpPerCorrect: 6,
  },
  'tile-match': {
    id: 'tile-match',
    title: 'Tile & Joker Match',
    tag: 'Beginner',
    description: 'Tap the matching pairs as fast as you can. Jokers are wild for groups of 3+.',
    gradient: ['#10B981', '#047857'] as const,
    rounds: 14,
    xpPerCorrect: 8,
  },
  'card-reader': {
    id: 'card-reader',
    title: 'Card Reader',
    tag: 'Intermediate',
    description: 'Map the tiles you see to the correct NMJL hand line.',
    gradient: ['#DC2626', '#7F1D1D'] as const,
    rounds: 12,
    xpPerCorrect: 12,
  },
  charleston: {
    id: 'charleston',
    title: 'Charleston Trainer',
    tag: 'Beginner',
    description: 'Pick 3 tiles to pass — the worst-fitting tiles for your target hand.',
    gradient: ['#F59E0B', '#B45309'] as const,
    rounds: 10,
    xpPerCorrect: 14,
  },
  'hand-picker': {
    id: 'hand-picker',
    title: 'Hand Picker',
    tag: 'Intermediate',
    description: 'Pick the most promising target hand for your starting 13 tiles.',
    gradient: ['#3B82F6', '#1E3A8A'] as const,
    rounds: 10,
    xpPerCorrect: 16,
  },
  discard: {
    id: 'discard',
    title: 'Discard Decision',
    tag: 'Advanced',
    description: 'Choose the safest discard given the visible exposures.',
    gradient: ['#0E1714', '#3F4D46'] as const,
    rounds: 12,
    xpPerCorrect: 18,
  },
  'joker-swap': {
    id: 'joker-swap',
    title: 'Joker Swap Drill',
    tag: 'Intermediate',
    description: 'Identify legal joker swaps. Tap GO if legal, NO if not.',
    gradient: ['#A855F7', '#6B21A8'] as const,
    rounds: 14,
    xpPerCorrect: 10,
  },
};

// ─────────── ROUND BUILDERS ───────────

export type MatchRound = {
  prompt: string;
  pile: TileSpec[]; // four options
  correctIndex: number;
};

export type ReaderRound = {
  prompt: string; // human description of line
  tiles: TileSpec[];
  options: string[];
  correctIndex: number;
};

export type CharlestonRound = {
  targetHand: string;
  hand: TileSpec[]; // 13 tiles
  // indexes of tiles that are correct to pass (the 3 worst fits)
  correctIndexes: number[];
};

export type HandPickerRound = {
  hand: TileSpec[];
  options: string[];
  correctIndex: number;
  reason: string;
};

export type DiscardRound = {
  exposures: string;
  hand: TileSpec[]; // 5 candidate discards
  correctIndex: number;
  reason: string;
};

export type JokerSwapRound = {
  description: string;
  legal: boolean;
};

export type FirstLookRound = {
  // Friendly true/false coaching round for absolute beginners.
  // Each round teaches ONE foundational fact about American Mahjong.
  topic: string; // short label shown above the question (e.g. 'THE GOAL')
  question: string;
  answer: boolean; // true = TRUE / Yes, false = FALSE / No
  explanation: string; // shown after answering, regardless of result
  tiles?: TileSpec[]; // optional tiles to illustrate the concept
};

export const FIRST_LOOK_ROUNDS: FirstLookRound[] = [
  {
    topic: 'THE GOAL',
    question: 'The goal of American Mahjong is to be the first player to complete a hand of 14 tiles that matches one of the lines printed on the official NMJL card.',
    answer: true,
    explanation: 'Yes! Unlike other mahjong variants, in American Mahjong you must match an EXACT pattern from this year\'s NMJL card — no free-form hands.',
  },
  {
    topic: 'THE TILES',
    question: 'There are three suits in American Mahjong: Bams (bamboo), Craks (characters), and Dots (circles).',
    answer: true,
    explanation: 'Correct. Each suit has tiles numbered 1 through 9, and there are 4 of each tile in the set.',
    tiles: [t('bam', '5'), t('crak', '5'), t('dot', '5')],
  },
  {
    topic: 'HONOR TILES',
    question: 'Winds (East, South, West, North) and Dragons (Red, Green, White) belong to a numbered suit.',
    answer: false,
    explanation: 'False — Winds and Dragons are HONOR tiles. They have no number and no suit. They are used in special hands on the card.',
    tiles: [t('wind', 'E'), t('dragon', 'R'), t('dragon', 'G'), t('dragon', 'Wh')],
  },
  {
    topic: 'JOKERS',
    question: 'A Joker can be used as ANY tile in your hand, including to complete a pair.',
    answer: false,
    explanation: 'False — Jokers are wild ONLY for groups of 3 or more (pungs, kongs, quints). They can NEVER stand in for a single or a pair.',
    tiles: [t('joker')],
  },
  {
    topic: 'STARTING HAND',
    question: 'At the start of the game, each player is dealt 13 tiles (the dealer gets 14).',
    answer: true,
    explanation: 'Yes. You begin with 13 tiles. On your turn you draw to 14, then discard back down to 13.',
  },
  {
    topic: 'THE CHARLESTON',
    question: 'Before play begins, players pass tiles to each other in a ritual called the Charleston.',
    answer: true,
    explanation: 'Correct. The Charleston is a series of 3-tile passes (right, across, left, then optionally back) used to shape your hand toward a target on the card.',
  },
  {
    topic: 'YOUR TURN',
    question: 'On every turn, you must pick up a tile from the wall AND discard a tile face-up.',
    answer: true,
    explanation: 'Yes — draw one, discard one. That is the basic rhythm of the game on every turn.',
  },
  {
    topic: 'CALLING DISCARDS',
    question: 'You can pick up ANY discarded tile from any player at any time, just to keep it in your hand.',
    answer: false,
    explanation: 'False — you can only CALL a discard when it completes a pung, kong, or quint that you EXPOSE on your rack. You cannot just grab tiles for fun.',
  },
  {
    topic: 'EXPOSURES',
    question: 'When you call a tile to make a pung, kong, or quint, you must place that group face-up on your rack for everyone to see.',
    answer: true,
    explanation: 'Right. This is called an EXPOSURE. It is public information and helps opponents guess what hand you are building.',
  },
  {
    topic: 'THE CARD',
    question: 'The NMJL card changes every year, so the legal hands you can build this year are different from last year.',
    answer: true,
    explanation: 'Yes. The National Mah Jongg League publishes a new card each April. Old cards are not legal in tournament play.',
  },
  {
    topic: 'WINNING',
    question: 'You win by calling "Mahjong!" the moment your 14 tiles match an exact hand on the card.',
    answer: true,
    explanation: 'Correct! You can declare Mahjong on your own draw OR by claiming a discard that completes your hand.',
  },
  {
    topic: 'FLOWERS',
    question: 'Flower tiles are useless and should always be discarded immediately.',
    answer: false,
    explanation: 'False — many hands on the NMJL card REQUIRE flowers (often a pair or kong of them). Always check the card before tossing a flower.',
    tiles: [t('flower'), t('flower')],
  },
];

// Tile & Joker Match — find the ONLY legal completion.
// Rule: Jokers can complete pungs/kongs/quints (groups of 3+) but NEVER
// pairs or singles. When a real matching tile is available, prefer it
// over a joker (jokers are last-resort).
export const MATCH_ROUNDS: MatchRound[] = [
  {
    prompt: 'You hold a pair of 3-bam. Which tile completes the pung?',
    pile: [t('dot', '3'), t('crak', '3'), t('bam', '3'), t('bam', '5')],
    correctIndex: 2,
  },
  {
    prompt: 'You have two red dragons. Which tile is a legal third for the pung?',
    pile: [t('dragon', 'G'), t('dragon', 'R'), t('dragon', 'Wh'), t('crak', '7')],
    correctIndex: 1,
  },
  {
    prompt: 'You hold a pair of 2-craks and need a third for a pung. The pile has NO real 2-craks. Which tile is a LEGAL completion?',
    pile: [t('joker'), t('crak', '3'), t('dot', '2'), t('bam', '2')],
    correctIndex: 0,
  },
  {
    prompt: 'You have one flower and need a pair. Jokers cannot complete pairs. Pick the legal tile.',
    pile: [t('crak', '5'), t('flower'), t('joker'), t('wind', 'E')],
    correctIndex: 1,
  },
  {
    prompt: 'Your hand calls for an East wind. Choose it.',
    pile: [t('wind', 'N'), t('wind', 'W'), t('wind', 'E'), t('wind', 'S')],
    correctIndex: 2,
  },
  {
    prompt: 'Pung of 7-craks needs a third tile. Which is the BEST completion (real tile preferred over joker)?',
    pile: [t('crak', '7'), t('joker'), t('crak', '8'), t('dot', '7')],
    correctIndex: 0,
  },
  {
    prompt: 'You have a single 5-dot and need a pair. Jokers cannot make pairs. Pick the legal tile.',
    pile: [t('joker'), t('dot', '5'), t('dot', '6'), t('crak', '5')],
    correctIndex: 1,
  },
  {
    prompt: 'White Soap (white dragon) is needed. Pick it.',
    pile: [t('dragon', 'R'), t('dragon', 'Wh'), t('dragon', 'G'), t('wind', 'W')],
    correctIndex: 1,
  },
  {
    prompt: 'You have three 9-bams and need a fourth for a kong. The pile has no real 9-bams. Which is LEGAL?',
    pile: [t('bam', '8'), t('joker'), t('dot', '9'), t('crak', '9')],
    correctIndex: 1,
  },
  {
    prompt: 'You need a North wind to complete NEWS (singles). Jokers cannot fill singles. Pick the legal tile.',
    pile: [t('joker'), t('wind', 'S'), t('wind', 'N'), t('dragon', 'Wh')],
    correctIndex: 2,
  },
  {
    prompt: 'You have four 6-dots and need a fifth for a quint. No real 6-dots in pile. Which is LEGAL?',
    pile: [t('dot', '5'), t('crak', '6'), t('joker'), t('bam', '6')],
    correctIndex: 2,
  },
  {
    prompt: 'You hold the digit 0 (white dragon used as zero in Year hand). Pick the tile that represents 0.',
    pile: [t('dragon', 'R'), t('dragon', 'Wh'), t('dragon', 'G'), t('crak', '0')],
    correctIndex: 1,
  },
  {
    prompt: 'You need a third flower. The pile has no real flowers. Which is a LEGAL completion of a kong of flowers?',
    pile: [t('joker'), t('crak', '5'), t('wind', 'E'), t('dot', '8')],
    correctIndex: 0,
  },
  {
    prompt: 'You have two 4-craks and need a third for a pung. Both a real 4-crak AND a joker are available. Pick the BEST (preferred) tile.',
    pile: [t('joker'), t('crak', '4'), t('dot', '4'), t('bam', '4')],
    correctIndex: 1,
  },
];

// Card Reader — translate tiles to a hand line on the NMJL 2026 card.
export const READER_ROUNDS: ReaderRound[] = [
  {
    prompt: 'Identify the hand line from these tiles:',
    tiles: [
      t('flower'), t('flower'), t('flower'),
      t('crak', '2'), t('dragon', 'Wh'), t('crak', '2'), t('crak', '6'),
      t('crak', '2'), t('crak', '2'), t('crak', '2'),
      t('crak', '6'), t('crak', '6'), t('crak', '6'), t('crak', '6'),
    ],
    options: ['FFF 2026 222 6666', 'FFF 2026 NEWS', 'FF 2026 2026 2026', 'FFF 2026 666 2222'],
    correctIndex: 0,
  },
  {
    prompt: 'Which line matches?',
    tiles: [
      t('bam', '1'), t('bam', '2'), t('bam', '3'),
      t('crak', '4'), t('crak', '5'), t('crak', '6'),
      t('dot', '7'), t('dot', '8'), t('dot', '9'),
    ],
    options: ['Like Numbers 5', 'Consecutive Run 1-2-3 / 4-5-6 / 7-8-9', '13579', '369'],
    correctIndex: 1,
  },
  {
    prompt: 'Which line matches? (three pungs of 5 across all suits)',
    tiles: [
      t('bam', '5'), t('bam', '5'), t('bam', '5'),
      t('crak', '5'), t('crak', '5'), t('crak', '5'),
      t('dot', '5'), t('dot', '5'), t('dot', '5'),
    ],
    options: ['Consecutive Run', 'Like Numbers 5s', 'Quint of 5s', 'Singles & Pairs'],
    correctIndex: 1,
  },
  {
    prompt: 'Which line matches?',
    tiles: [
      t('bam', '3'), t('bam', '6'), t('bam', '9'),
      t('crak', '3'), t('crak', '6'), t('crak', '9'),
      t('dot', '3'), t('dot', '6'), t('dot', '9'),
    ],
    options: ['369', '13579', '2468', 'Quints'],
    correctIndex: 0,
  },
  {
    prompt: 'Which line matches? (NEWS + two pungs of dragons + pair)',
    tiles: [
      t('wind', 'N'), t('wind', 'E'), t('wind', 'W'), t('wind', 'S'),
      t('dragon', 'R'), t('dragon', 'R'), t('dragon', 'R'),
      t('dragon', 'G'), t('dragon', 'G'), t('dragon', 'G'),
      t('dragon', 'Wh'), t('dragon', 'Wh'),
    ],
    options: ['369', 'Year', 'Winds & Dragons (NEWS + DDD + DDD + pair)', 'Like Numbers'],
    correctIndex: 2,
  },
  {
    prompt: 'Which line matches?',
    tiles: [
      t('dot', '2'), t('dot', '4'), t('dot', '6'), t('dot', '8'),
      t('crak', '2'), t('crak', '4'), t('crak', '6'), t('crak', '8'),
    ],
    options: ['2468', '13579', '369', 'Year'],
    correctIndex: 0,
  },
  {
    prompt: 'Which line matches? (pungs of 1, 3, 5, 7 and pair of 9 — one suit)',
    tiles: [
      t('bam', '1'), t('bam', '1'), t('bam', '1'),
      t('bam', '3'), t('bam', '3'), t('bam', '3'),
      t('bam', '5'), t('bam', '5'), t('bam', '5'),
      t('bam', '7'), t('bam', '7'), t('bam', '7'),
      t('bam', '9'), t('bam', '9'),
    ],
    options: ['369', '13579', '2468', 'Year'],
    correctIndex: 1,
  },
  {
    prompt: 'Which line matches? (pair, pung, kong, kong of consecutive numbers in one suit)',
    tiles: [
      t('crak', '1'), t('crak', '1'),
      t('crak', '2'), t('crak', '2'), t('crak', '2'),
      t('crak', '3'), t('crak', '3'), t('crak', '3'), t('crak', '3'),
      t('crak', '4'), t('crak', '4'), t('crak', '4'), t('crak', '4'),
    ],
    options: ['Consecutive Run 11 222 3333 4444', '13579', 'Like Numbers', 'Quints'],
    correctIndex: 0,
  },
  {
    prompt: 'Which line matches? (FF + two quints — concealed)',
    tiles: [
      t('flower'), t('flower'),
      t('bam', '1'), t('bam', '1'), t('bam', '1'), t('bam', '1'), t('bam', '1'),
      t('bam', '2'), t('bam', '2'), t('bam', '2'), t('bam', '2'), t('bam', '2'),
      t('bam', '3'), t('bam', '3'),
    ],
    options: ['Quints (FF 11111 22222 33)', '2468', 'Year', '369'],
    correctIndex: 0,
  },
  {
    prompt: 'Which line matches? (seven pairs, concealed, no jokers)',
    tiles: [
      t('crak', '1'), t('crak', '1'),
      t('crak', '2'), t('crak', '2'),
      t('crak', '3'), t('crak', '3'),
      t('crak', '4'), t('crak', '4'),
      t('crak', '5'), t('crak', '5'),
      t('crak', '6'), t('crak', '6'),
      t('crak', '7'), t('crak', '7'),
    ],
    options: ['Singles & Pairs (concealed)', 'Quints', '369', 'Like Numbers'],
    correctIndex: 0,
  },
  {
    prompt: 'Which line matches? (pungs of 2, 4, 6, 8 in one suit + pair of dragons)',
    tiles: [
      t('dot', '2'), t('dot', '2'), t('dot', '2'),
      t('dot', '4'), t('dot', '4'), t('dot', '4'),
      t('dot', '6'), t('dot', '6'), t('dot', '6'),
      t('dot', '8'), t('dot', '8'), t('dot', '8'),
      t('dragon', 'R'), t('dragon', 'R'),
    ],
    options: ['2468', '13579', '369', 'Year'],
    correctIndex: 0,
  },
  {
    prompt: 'Which line matches? (FF + 2222 0000 2222 5555 — Year classic)',
    tiles: [
      t('flower'), t('flower'),
      t('bam', '2'), t('bam', '2'), t('bam', '2'), t('bam', '2'),
      t('crak', '0'), t('crak', '0'), t('crak', '0'), t('crak', '0'),
      t('dot', '2'), t('dot', '2'), t('dot', '2'), t('dot', '2'),
    ],
    options: ['Year FF 2222 0000 2222 (continued 5555)', '13579', '369', 'Quints'],
    correctIndex: 0,
  },
];

// Charleston Trainer — pick the 3 worst-fitting tiles to pass.
export const CHARLESTON_ROUNDS: CharlestonRound[] = [
  {
    targetHand: 'Year hand: FFF 2026 222 6666',
    hand: [
      t('flower'), t('flower'), t('flower'),        // 0,1,2 keep
      t('crak', '2'), t('dragon', 'Wh'),             // 3,4 keep (2 and 0=DWh)
      t('crak', '2'), t('crak', '6'),               // 5,6 keep
      t('bam', '7'), t('bam', '8'), t('dot', '3'),  // 7,8,9 PASS
      t('crak', '2'),                               // 10 keep
      t('joker'),                                    // 11 keep
      t('crak', '6'),
    ],
    correctIndexes: [7, 8, 9],
  },
  {
    targetHand: 'Like Numbers — three pungs of 5s',
    hand: [
      t('bam', '5'), t('bam', '5'),
      t('crak', '5'), t('crak', '5'),
      t('dot', '5'),
      t('joker'), t('joker'),
      t('wind', 'N'), t('dragon', 'R'),             // 7,8 PASS
      t('flower'),                                   // 9 PASS
      t('bam', '2'), t('crak', '8'), t('dot', '1'),
    ],
    correctIndexes: [7, 8, 9],
  },
  {
    targetHand: 'Consecutive Run 4-5-6 across 3 suits',
    hand: [
      t('bam', '4'), t('bam', '5'), t('bam', '6'),
      t('crak', '4'), t('crak', '5'), t('crak', '6'),
      t('dot', '4'), t('dot', '5'),
      t('joker'),
      t('wind', 'S'), t('flower'), t('dragon', 'G'), // 9,10,11 PASS
      t('crak', '1'),
    ],
    correctIndexes: [9, 10, 11],
  },
  {
    targetHand: '2468 — pungs of 2,4,6,8 in two suits',
    hand: [
      t('bam', '2'), t('bam', '2'),
      t('bam', '4'), t('bam', '4'),
      t('crak', '6'), t('crak', '6'),
      t('crak', '8'), t('crak', '8'),
      t('joker'),
      t('flower'),                                   // 9 PASS
      t('dragon', 'R'), t('dragon', 'G'),            // 10,11 PASS
      t('dot', '5'),
    ],
    correctIndexes: [9, 10, 11],
  },
  {
    targetHand: 'Singles & Pairs — concealed, NO jokers allowed',
    hand: [
      t('bam', '1'), t('bam', '1'),
      t('crak', '3'), t('crak', '3'),
      t('dot', '5'), t('dot', '5'),
      t('wind', 'N'), t('wind', 'E'),
      t('joker'), t('joker'), t('joker'),            // 8,9,10 PASS — illegal in S&P
      t('flower'), t('dragon', 'R'),
    ],
    correctIndexes: [8, 9, 10],
  },
  {
    targetHand: '369 hand — pungs of 3, 6, 9 in three suits + pair',
    hand: [
      t('bam', '3'), t('bam', '3'),
      t('crak', '6'), t('crak', '6'),
      t('dot', '9'), t('dot', '9'),
      t('joker'),
      t('wind', 'E'), t('wind', 'W'),                // 7,8 PASS — winds not in 369
      t('crak', '1'),                                 // 9 PASS — odd non-369
      t('dragon', 'R'),                               // 10 keep as pair candidate
      t('bam', '6'), t('crak', '9'),
    ],
    correctIndexes: [7, 8, 9],
  },
  {
    targetHand: '13579 hand — pungs of odd numbers, one suit',
    hand: [
      t('crak', '1'), t('crak', '1'),
      t('crak', '3'), t('crak', '3'),
      t('crak', '5'), t('crak', '5'),
      t('crak', '7'), t('crak', '7'),
      t('crak', '9'),
      t('joker'),
      t('bam', '2'), t('dot', '4'), t('flower'),    // 10,11,12 PASS — even tiles + flower not used
    ],
    correctIndexes: [10, 11, 12],
  },
  {
    targetHand: 'Winds & Dragons — NEWS + DDD + DDD + pair',
    hand: [
      t('wind', 'N'), t('wind', 'E'),
      t('wind', 'S'), t('wind', 'W'),
      t('dragon', 'R'), t('dragon', 'R'),
      t('dragon', 'G'), t('dragon', 'G'),
      t('joker'),
      t('crak', '4'), t('bam', '7'), t('dot', '2'),  // 9,10,11 PASS — number tiles unused
      t('dragon', 'Wh'),
    ],
    correctIndexes: [9, 10, 11],
  },
  {
    targetHand: 'Quints — FF 11111 22 33333 (Any 3 Consec. Nos.)',
    hand: [
      t('flower'), t('flower'),
      t('bam', '1'), t('bam', '1'), t('bam', '1'),
      t('bam', '2'), t('bam', '2'), t('bam', '2'),
      t('joker'), t('joker'),
      t('crak', '7'), t('dot', '8'), t('wind', 'E'), // 10,11,12 PASS — off-line
    ],
    correctIndexes: [10, 11, 12],
  },
  {
    targetHand: 'Year hand: 222 000 2222 6666 (Any 3 Suits)',
    hand: [
      t('bam', '2'), t('bam', '2'), t('bam', '2'),  // 0,1,2 keep
      t('dragon', 'Wh'), t('dragon', 'Wh'),           // 3,4 keep (000)
      t('crak', '2'), t('crak', '2'),                 // 5,6 keep
      t('joker'),                                      // 7 keep
      t('dot', '6'),                                   // 8 keep
      t('wind', 'W'), t('dragon', 'G'), t('bam', '7'), // 9,10,11 PASS — off-line
      t('crak', '6'),
    ],
    correctIndexes: [9, 10, 11],
  },
];

// Hand Picker — choose the best target hand from the NMJL 2026 card.
export const HAND_PICKER_ROUNDS: HandPickerRound[] = [
  {
    hand: [
      t('flower'), t('flower'), t('flower'),
      t('crak', '2'), t('dragon', 'Wh'),
      t('crak', '2'), t('crak', '6'),
      t('crak', '2'), t('crak', '2'),
      t('joker'), t('crak', '6'), t('crak', '6'), t('bam', '7'),
    ],
    options: ['369', 'Year (FFF 2026 222 6666)', 'Singles & Pairs', 'Like Numbers'],
    correctIndex: 1,
    reason: 'Three flowers + year digits 2,0,2,6 + multiple 2s and 6s = strong 2026 Year hand foundation.',
  },
  {
    hand: [
      t('bam', '5'), t('bam', '5'),
      t('crak', '5'), t('crak', '5'),
      t('dot', '5'),
      t('joker'), t('joker'),
      t('bam', '2'), t('crak', '8'), t('dot', '1'),
      t('wind', 'N'), t('flower'), t('dragon', 'R'),
    ],
    options: ['2468', 'Like Numbers (5s)', 'Consecutive Run', 'Year'],
    correctIndex: 1,
    reason: 'You have pairs of 5 in all three suits and 2 jokers — pure Like Numbers fuel.',
  },
  {
    hand: [
      t('bam', '3'), t('bam', '6'), t('bam', '9'),
      t('crak', '3'), t('crak', '6'), t('crak', '9'),
      t('dot', '3'), t('dot', '6'), t('dot', '9'),
      t('joker'), t('flower'), t('wind', 'E'), t('dragon', 'G'),
    ],
    options: ['369', '2468', 'Singles & Pairs', 'Year'],
    correctIndex: 0,
    reason: '3-6-9 in all three suits — every number tile slots into the 369 line.',
  },
  {
    hand: [
      t('dot', '2'), t('dot', '4'), t('dot', '6'), t('dot', '8'),
      t('crak', '2'), t('crak', '4'), t('crak', '6'), t('crak', '8'),
      t('joker'), t('joker'),
      t('bam', '5'), t('flower'), t('dragon', 'Wh'),
    ],
    options: ['369', '2468', '13579', 'Like Numbers'],
    correctIndex: 1,
    reason: 'All even digits in two suits and two jokers — straight 2468 setup.',
  },
  {
    hand: [
      t('dragon', 'R'), t('dragon', 'R'), t('dragon', 'R'),
      t('dragon', 'G'), t('dragon', 'G'),
      t('wind', 'N'), t('wind', 'E'), t('wind', 'S'), t('wind', 'W'),
      t('joker'), t('flower'), t('flower'), t('crak', '4'),
    ],
    options: ['Year', 'Winds & Dragons', '13579', 'Quints'],
    correctIndex: 1,
    reason: 'Pung of red dragons, pair of greens, and full NEWS — classic Winds & Dragons.',
  },
  {
    hand: [
      t('crak', '1'), t('crak', '1'), t('crak', '1'),
      t('crak', '3'), t('crak', '3'),
      t('crak', '5'), t('crak', '5'), t('crak', '5'),
      t('crak', '7'), t('crak', '7'),
      t('crak', '9'),
      t('joker'), t('flower'),
    ],
    options: ['369', '13579 (one suit)', '2468', 'Year'],
    correctIndex: 1,
    reason: 'All odd digits 1,3,5,7,9 concentrated in craks — perfect 13579 single-suit run.',
  },
  {
    hand: [
      t('bam', '1'), t('bam', '1'),
      t('bam', '2'), t('bam', '2'), t('bam', '2'),
      t('bam', '3'), t('bam', '3'),
      t('bam', '4'), t('bam', '4'),
      t('joker'), t('joker'),
      t('dot', '7'), t('flower'),
    ],
    options: ['Consecutive Run (one suit)', '369', 'Year', 'Winds & Dragons'],
    correctIndex: 0,
    reason: 'Consecutive bams 1-2-3-4 with multiples of each — set up for Consecutive Run.',
  },
  {
    hand: [
      t('flower'), t('flower'), t('flower'), t('flower'),
      t('bam', '1'), t('bam', '1'), t('bam', '1'),
      t('bam', '1'), t('bam', '1'),
      t('bam', '2'), t('bam', '2'),
      t('joker'), t('crak', '7'),
    ],
    options: ['Quints (concealed)', '2468', '369', 'Year'],
    correctIndex: 0,
    reason: 'FF + a near-complete quint of 1-bam — points the way to a high-value Quints hand.',
  },
  {
    hand: [
      t('crak', '1'), t('crak', '1'),
      t('crak', '2'), t('crak', '2'),
      t('crak', '3'), t('crak', '3'),
      t('crak', '4'), t('crak', '4'),
      t('crak', '5'), t('crak', '5'),
      t('crak', '6'),
      t('crak', '7'), t('flower'),
    ],
    options: ['Singles & Pairs (concealed, one suit)', '369', 'Year', 'Quints'],
    correctIndex: 0,
    reason: 'Five matched pairs already, all in craks — Singles & Pairs is one tile away.',
  },
  {
    hand: [
      t('flower'), t('flower'),
      t('bam', '2'), t('bam', '2'), t('bam', '2'),
      t('crak', '0'), t('crak', '0'),
      t('dot', '5'), t('dot', '5'),
      t('joker'), t('joker'),
      t('wind', 'N'), t('crak', '8'),
    ],
    options: ['Year FF 2222 0000 2222 5555', '13579', 'Winds & Dragons', '369'],
    correctIndex: 0,
    reason: 'FF + multiples of 2, 0, and 5 with jokers — classic Year (FF 2222 0000 ... 5555).',
  },
];

// Discard Decision — pick the safest tile.
export const DISCARD_ROUNDS: DiscardRound[] = [
  {
    exposures: 'Right opponent exposed PUNG of 4-craks. Across opponent exposed KONG of flowers.',
    hand: [t('crak', '4'), t('bam', '7'), t('dot', '2'), t('flower'), t('crak', '5')],
    correctIndex: 1,
    reason: 'Bam 7 is unrelated to either visible exposure — safest throw.',
  },
  {
    exposures: 'Left opponent has KONG of East winds + PUNG of red dragons.',
    hand: [t('wind', 'E'), t('dragon', 'R'), t('crak', '6'), t('dot', '8'), t('bam', '3')],
    correctIndex: 4,
    reason: 'Bam 3 has nothing to do with winds-and-dragons hands — safe.',
  },
  {
    exposures: 'Across opponent exposed FFFF and PUNG of 2-craks. Likely Year hand.',
    hand: [t('crak', '2'), t('flower'), t('wind', 'N'), t('bam', '5'), t('dot', '7')],
    correctIndex: 3,
    reason: 'Year hands need NEWS — bam 5 is not used in Year.',
  },
  {
    exposures: 'Right opponent has 3 exposed pungs in BAM suit.',
    hand: [t('bam', '6'), t('crak', '4'), t('dot', '9'), t('bam', '8'), t('flower')],
    correctIndex: 4,
    reason: 'They are clearly building a one-suit bam hand — flower is unrelated.',
  },
  {
    exposures: 'Across opponent exposed PUNG of 6-dots. Discard pile shows 3 jokers already.',
    hand: [t('dot', '6'), t('crak', '5'), t('bam', '2'), t('joker'), t('dot', '9')],
    correctIndex: 2,
    reason: 'Bam 2 is far from the 6-dot pung and not a connector. Safest discard.',
  },
  {
    exposures: 'Left exposed KONG of green dragons. Across exposed PUNG of West winds.',
    hand: [t('dragon', 'G'), t('wind', 'W'), t('crak', '7'), t('bam', '1'), t('dot', '4')],
    correctIndex: 3,
    reason: 'Bam 1 is unrelated to the dragons-and-winds attacks in progress.',
  },
  {
    exposures: 'Right opponent exposed KONG of 3-dots and PUNG of 6-dots — building 369 in dots.',
    hand: [t('dot', '9'), t('dot', '3'), t('crak', '5'), t('bam', '8'), t('dot', '6')],
    correctIndex: 3,
    reason: 'Every dot tile feeds their 369 hand. Bam 8 is the only off-suit, off-pattern tile.',
  },
  {
    exposures: 'Across exposed PUNG of 1-craks and PUNG of 3-craks — looks like 13579 craks.',
    hand: [t('crak', '5'), t('crak', '7'), t('crak', '9'), t('dot', '4'), t('crak', '1')],
    correctIndex: 3,
    reason: 'Dot 4 has nothing to do with a one-suit 13579 crak hand.',
  },
  {
    exposures: 'Left exposed KONG of 2-bams and PUNG of 4-bams — likely 2468 bams.',
    hand: [t('bam', '6'), t('bam', '8'), t('crak', '5'), t('dragon', 'Wh'), t('bam', '2')],
    correctIndex: 2,
    reason: 'Crak 5 is an odd, off-suit tile — useless to a 2468 bam hand.',
  },
  {
    exposures: 'Across exposed FFFF and KONG of North winds — Year hand in progress.',
    hand: [t('wind', 'N'), t('flower'), t('crak', '2'), t('bam', '6'), t('crak', '0')],
    correctIndex: 3,
    reason: 'Year needs NEWS + digits 2,0,2,5 — bam 6 is the only tile not on that list.',
  },
  {
    exposures: 'Right exposed PUNG of red dragons, PUNG of green dragons — Winds & Dragons.',
    hand: [t('dragon', 'Wh'), t('wind', 'E'), t('crak', '7'), t('bam', '3'), t('dot', '9')],
    correctIndex: 2,
    reason: 'Crak 7 is a number tile — Winds & Dragons hands have no number tiles.',
  },
  {
    exposures: 'Left exposed KONG of flowers and PUNG of 5-craks. No other reads.',
    hand: [t('flower'), t('crak', '5'), t('bam', '4'), t('dot', '6'), t('crak', '8')],
    correctIndex: 2,
    reason: 'Bam 4 is unrelated to the flower/5-crak signal — safer than feeding either.',
  },
];

// Joker Swap Drill — legal or not.
export const JOKER_SWAP_ROUNDS: JokerSwapRound[] = [
  {
    description: 'Opponent exposed PUNG of 5-bams using a joker. It is your turn and you hold a real 5-bam. Swap?',
    legal: true,
  },
  {
    description: 'Opponent claims to have exposed a PAIR of 4-dots using a joker. You hold a real 4-dot. Swap?',
    legal: false,
  },
  {
    description: 'Opponent exposed KONG of red dragons containing one joker. It is your turn and you hold a red dragon. Swap?',
    legal: true,
  },
  {
    description: 'It is your turn. You hold a real 7-crak; an opponent has a joker inside a pung of 7-craks. Swap?',
    legal: true,
  },
  {
    description: 'It is NOT your turn. You want to swap a tile for a joker in an opponent\'s exposure. Swap?',
    legal: false,
  },
  {
    description: 'A joker is in YOUR own exposed pung. You want to take it back into your concealed hand without giving anything in exchange. Swap?',
    legal: false,
  },
  {
    description: 'Opponent exposed QUINT of 8-dots (with two jokers). It is your turn and you hold one real 8-dot. Swap?',
    legal: true,
  },
  {
    description: 'A joker is sitting face-up in the discard pile. You want to claim it. Swap?',
    legal: false,
  },
  {
    description: 'It is your turn. Your own exposed kong of 3-craks contains a joker, and you hold a real 3-crak. You want to swap your real tile for that joker. Swap?',
    legal: true,
  },
  {
    description: 'Opponent exposed PUNG of green dragons with a joker. You hold a RED dragon (wrong color) and want to swap it for the joker. Swap?',
    legal: false,
  },
  {
    description: 'It is your turn. Opponent exposed KONG of 2-bams using a joker. You hold a real 2-bam. Swap?',
    legal: true,
  },
  {
    description: 'Opponent has a joker in a SINGLE position of a Singles & Pairs hand. You hold the matching real tile and want to swap. Swap?',
    legal: false,
  },
  {
    description: 'It is your turn. You hold a real flower; an opponent has a joker inside an exposed kong of flowers. Swap?',
    legal: true,
  },
  {
    description: 'You drew a joker from the wall this turn. You want to immediately swap it into an opponent\'s exposure for one of their real tiles. Swap?',
    legal: false,
  },
];
