// NMJL 2025 card — representative subset of hands.
// Real card has ~71 hands; we encode the most common categories so
// validateHand() can recognize legal winning hands.
//
// INVARIANT: every pattern below MUST total exactly 14 tiles. This is
// enforced at module load by warnIfInvalidHandSize (dev-only warning).
import { registerYearCard, type HandPattern, G, M } from "../rules";
import { warnIfInvalidHandSize } from "../sort";

const CARD_2025: HandPattern[] = [
  {
    id: "2025-year-classic",
    year: 2025,
    category: "2025",
    description: "FF 2222 0000 2222 5555",
    points: 25,
    concealed: false,
    // 2 + 4 + 4 + 4 = 14
    groups: [
      G.pair(M.flower()),
      G.kong(M.any("2")),
      G.kong(M.any("0")),
      G.kong(M.any("5")),
    ],
  },
  {
    id: "2025-year-news",
    year: 2025,
    category: "2025",
    description: "FFFF 2025 NEWS",
    points: 25,
    concealed: false,
    // 4 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 = 14
    groups: [
      G.kong(M.flower()),
      G.single(M.any("2")),
      G.single(M.any("0")),
      G.single(M.any("2")),
      G.single(M.any("5")),
      G.single(M.wind("N")),
      G.single(M.wind("E")),
      G.single(M.wind("W")),
      G.single(M.wind("S")),
      G.single(M.dragon("R")),
      G.single(M.dragon("G")),
    ],
  },
  {
    id: "2025-2468-pungs",
    year: 2025,
    category: "2468",
    description: "222 444 666 888 (one suit) + DD",
    points: 25,
    concealed: false,
    // 3 + 3 + 3 + 3 + 2 = 14
    groups: [
      G.pung(M.any("2")),
      G.pung(M.any("4")),
      G.pung(M.any("6")),
      G.pung(M.any("8")),
      G.pair(M.dragon("R")),
    ],
  },
  {
    id: "2025-13579",
    year: 2025,
    category: "13579",
    description: "111 333 555 777 99 (one suit)",
    points: 25,
    concealed: false,
    // 3 + 3 + 3 + 3 + 2 = 14
    groups: [
      G.pung(M.any("1")),
      G.pung(M.any("3")),
      G.pung(M.any("5")),
      G.pung(M.any("7")),
      G.pair(M.any("9")),
    ],
  },
  {
    id: "2025-369",
    year: 2025,
    category: "369",
    description: "333 666 999 (3 suits) + GGG + DD",
    points: 25,
    concealed: false,
    // 3 + 3 + 3 + 3 + 2 = 14
    groups: [
      G.pung(M.exact("bam", "3")),
      G.pung(M.exact("crak", "6")),
      G.pung(M.exact("dot", "9")),
      G.pung(M.dragon("G")),
      G.pair(M.dragon("Wh")),
    ],
  },
  {
    id: "2025-winds-dragons",
    year: 2025,
    category: "WINDS_DRAGONS",
    description: "NEWS + RRRR + GGGG + WhWh",
    points: 30,
    concealed: false,
    // 1 + 1 + 1 + 1 + 4 + 4 + 2 = 14
    groups: [
      G.single(M.wind("N")),
      G.single(M.wind("E")),
      G.single(M.wind("W")),
      G.single(M.wind("S")),
      G.kong(M.dragon("R")),
      G.kong(M.dragon("G")),
      G.pair(M.dragon("Wh")),
    ],
  },
  {
    id: "2025-consec-run",
    year: 2025,
    category: "CONSECUTIVE_RUN",
    description: "11 2222 3333 4444 (one suit)",
    points: 25,
    concealed: false,
    // 2 + 4 + 4 + 4 = 14
    groups: [
      G.pair(M.any("1")),
      G.kong(M.any("2")),
      G.kong(M.any("3")),
      G.kong(M.any("4")),
    ],
  },
  {
    id: "2025-quints",
    year: 2025,
    category: "QUINTS",
    description: "FF 11111 22222 (one suit) — concealed",
    points: 40,
    concealed: true,
    // 2 + 5 + 5 + 2 = 14
    groups: [
      G.pair(M.flower()),
      G.quint(M.any("1")),
      G.quint(M.any("2")),
      G.pair(M.any("3")),
    ],
  },
  {
    id: "2025-singles-pairs",
    year: 2025,
    category: "SINGLES_PAIRS",
    description: "11 22 33 44 55 66 77 (one suit) — concealed",
    points: 50,
    concealed: true,
    // 2 × 7 = 14
    groups: [
      G.pair(M.any("1")),
      G.pair(M.any("2")),
      G.pair(M.any("3")),
      G.pair(M.any("4")),
      G.pair(M.any("5")),
      G.pair(M.any("6")),
      G.pair(M.any("7")),
    ],
  },
];

// Dev-only: warn loudly if any target hand is not exactly 14 tiles.
for (const p of CARD_2025) {
  warnIfInvalidHandSize(p.id, p.groups);
}

registerYearCard(2025, CARD_2025);

export default CARD_2025;
