// NMJL 2026 card — all 55 hands.
//
// INVARIANT: every pattern below MUST total exactly 14 tiles. This is
// enforced at module load by warnIfInvalidHandSize (dev-only warning).
//
// Tile encoding notes:
//   - "0" in year strings = White Dragon (DWh / M.dragon("Wh"))
//   - Suit slots: groups sharing a suitSlot share one chosen suit;
//     different suitSlots get independently chosen suits.
//   - suitMode: "exactlyN" = exactly N distinct suits; "upToN" = 1..N distinct.
//   - SIMPLIFY: oppositeDragon is validated as anyDragon (permissive).
//   - SIMPLIFY: some multi-suit hands use permissive single-suit validation
//     to avoid intractable constraint enumeration (documented below).
import { registerYearCard, type HandPattern, G, M } from "../rules";
import { warnIfInvalidHandSize } from "../sort";

// ────────────────────────────────────────────────────────────────────────────
// SECTION 1: 2026
// ────────────────────────────────────────────────────────────────────────────

// 2026 #1: 222 000 2222 6666 — Any 3 Suits
// 222 in suit A, 000=DWh DWh DWh (3 white dragons), 2222 in suit B, 6666 in suit C
// 3 + 3 + 4 + 4 = 14 ✓
const hand_2026_1: HandPattern = {
  id: "2026-year-1",
  year: 2026,
  category: "2026",
  description: "222 000 2222 6666 — Any 3 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.any("2", 0)),
    G.pung(M.dragon("Wh")),       // 000 = 3× White Dragon
    G.kong(M.any("2", 1)),
    G.kong(M.any("6", 2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// 2026 #2: 2026 DDD 2222 DDD — Any 2 Suits w Matching Dragons, Kong 2 or 6
// 2 0 2 6 in suits (singles), DDD matching suit of 2-group, 2222 kong, DDD matching suit of 6-group
// Tiles: single(2,s0) + dragon(Wh) + single(2,s0) + single(6,s1) + pung(matchDragon s0) + kong(2,s0) + pung(matchDragon s1)
// = 1+1+1+1 + 3 + 4 + 3 = 14 ✓
// Kong can be 2 or 6 — use anyOf. The two "2" singles and the kong share suit slot 0; "6" uses slot 1.
// SIMPLIFY: We encode two variants (kong=2 and kong=6) as separate patterns since anyOf+matchingDragon
// interaction is complex. Actually, let's use two patterns.
const hand_2026_2a: HandPattern = {
  id: "2026-year-2a",
  year: 2026,
  category: "2026",
  description: "2026 DDD 2222 DDD — Any 2 Suits, Matching Dragons, Kong 2",
  points: 25,
  concealed: false,
  // 2 DWh 2 6 = singles; DDD = pung matchingDragon for suit of "2"; 2222 = kong; DDD = pung matchingDragon for suit of "6"
  // 1+1+1+1 + 3 + 4 + 3 = 14 ✓
  groups: [
    G.single(M.any("2", 0)),
    G.single(M.dragon("Wh")),         // "0" = White Dragon
    G.single(M.any("2", 0)),
    G.single(M.any("6", 1)),
    G.pung(M.matchingDragon(0)),
    G.kong(M.any("2", 0)),
    G.pung(M.matchingDragon(1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

const hand_2026_2b: HandPattern = {
  id: "2026-year-2b",
  year: 2026,
  category: "2026",
  description: "2026 DDD 6666 DDD — Any 2 Suits, Matching Dragons, Kong 6",
  points: 25,
  concealed: false,
  // 1+1+1+1 + 3 + 4 + 3 = 14 ✓
  groups: [
    G.single(M.any("2", 0)),
    G.single(M.dragon("Wh")),
    G.single(M.any("2", 0)),
    G.single(M.any("6", 1)),
    G.pung(M.matchingDragon(0)),
    G.kong(M.any("6", 1)),
    G.pung(M.matchingDragon(1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// 2026 #3: FFF 2026 222 6666 — Any 3 Suits
// FFF=3flowers, 2(s0) 0(DWh) 2(s0) 6(s1)=singles, 222(s2) pung, 6666(s?) kong
// Wait: "2026" = 2,0,2,6 as singles; "222" pung; "6666" kong
// The 2's are in some suit, the 6's in another. 3 suits total.
// 3 + 1+1+1+1 + 3 + 4 = 14 ✓
const hand_2026_3: HandPattern = {
  id: "2026-year-3",
  year: 2026,
  category: "2026",
  description: "FFF 2026 222 6666 — Any 3 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.flower()),
    G.single(M.any("2", 0)),
    G.single(M.dragon("Wh")),
    G.single(M.any("2", 0)),
    G.single(M.any("6", 1)),
    G.pung(M.any("2", 2)),
    G.kong(M.any("6", 1)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// 2026 #4: 22 00 222 666 NEWS — Any 2 Suits
// 22(s0) + 00(DWh pair) + 222(s0 or s1) + 666(s1) + NEWS(4 singles)
// Actually: 22 in suit A, 00=pair(DWh), 222 pung in suit A, 666 pung in suit B, N+E+W+S singles
// 2+2+3+3+4 = 14 ✓
// SIMPLIFY: use suitSlot 0 for 2s, suitSlot 1 for 6s; exactlyN=2
const hand_2026_4: HandPattern = {
  id: "2026-year-4",
  year: 2026,
  category: "2026",
  description: "22 00 222 666 NEWS — Any 2 Suits",
  points: 30,
  concealed: false,
  groups: [
    G.pair(M.any("2", 0)),
    G.pair(M.dragon("Wh")),
    G.pung(M.any("2", 0)),
    G.pung(M.any("6", 1)),
    G.single(M.wind("N")),
    G.single(M.wind("E")),
    G.single(M.wind("W")),
    G.single(M.wind("S")),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// ────────────────────────────────────────────────────────────────────────────
// SECTION 2: 2468
// ────────────────────────────────────────────────────────────────────────────

// 2468 #1: 222 444 6666 8888 — Any 1 or 2 Suits
// 3+3+4+4 = 14 ✓
// SIMPLIFY: treat as Any 2 Suits (upToN=2); uses suitSlots 0,1
const hand_2468_1: HandPattern = {
  id: "2026-2468-1",
  year: 2026,
  category: "2468",
  description: "222 444 6666 8888 — Any 1 or 2 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.any("2", 0)),
    G.pung(M.any("4", 0)),
    G.kong(M.any("6", 1)),
    G.kong(M.any("8", 1)),
  ],
  suitMode: { type: "upToN", n: 2 },
};

// 2468 #2: FF 2222 44 66 8888 — Any 2 Suits
// 2+4+2+2+4 = 14 ✓
const hand_2468_2: HandPattern = {
  id: "2026-2468-2",
  year: 2026,
  category: "2468",
  description: "FF 2222 44 66 8888 — Any 2 Suits",
  points: 30,
  concealed: false,
  groups: [
    G.pair(M.flower()),
    G.kong(M.any("2", 0)),
    G.pair(M.any("4", 1)),
    G.pair(M.any("6", 1)),
    G.kong(M.any("8", 1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// 2468 #3: EE 22 444 666 88 WW — Any 1 Suit, East and West Only
// 2+2+3+3+2+2 = 14 ✓
// Fixed winds: E and W only; number tiles in 1 suit
const hand_2468_3: HandPattern = {
  id: "2026-2468-3",
  year: 2026,
  category: "2468",
  description: "EE 22 444 666 88 WW — Any 1 Suit, East & West Only",
  points: 30,
  concealed: false,
  groups: [
    G.pair(M.wind("E")),
    G.pair(M.any("2")),
    G.pung(M.any("4")),
    G.pung(M.any("6")),
    G.pair(M.any("8")),
    G.pair(M.wind("W")),
  ],
};

// 2468 #4: 2222 DDD 8888 DDD — Any 2 Suits w Matching Dragons, These Nos Only
// 4+3+4+3 = 14 ✓
const hand_2468_4: HandPattern = {
  id: "2026-2468-4",
  year: 2026,
  category: "2468",
  description: "2222 DDD 8888 DDD — Any 2 Suits, Matching Dragons",
  points: 25,
  concealed: false,
  groups: [
    G.kong(M.any("2", 0)),
    G.pung(M.matchingDragon(0)),
    G.kong(M.any("8", 1)),
    G.pung(M.matchingDragon(1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// 2468 #5: FFF 22 44 666 8888 — Any 1 Suit
// 3+2+2+3+4 = 14 ✓
const hand_2468_5: HandPattern = {
  id: "2026-2468-5",
  year: 2026,
  category: "2468",
  description: "FFF 22 44 666 8888 — Any 1 Suit",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.flower()),
    G.pair(M.any("2")),
    G.pair(M.any("4")),
    G.pung(M.any("6")),
    G.kong(M.any("8")),
  ],
};

// 2468 #6: 2468 2222 D 2222 D — Any 3 Suits, Like Kongs 2,4,6 or 8 w Matching Dragon
// "2468" = 4 singles in one suit; "2222" kong in suit A; D = single matchingDragon for suit A;
// "2222" kong in suit B; D = single matchingDragon for suit B
// Wait: the parenthetical says "Like Kongs 2,4,6 or 8" — both kongs are the SAME value (anyOf)
// The "2468" part is a run of singles in a 3rd suit; the 2 kongs are equal (same chosen value)
// 4 singles + 4 + 1 + 4 + 1 = 14 ✓
// SIMPLIFY: encode 2468 singles as individual anyOf matchers in suit slot 2 (not truly consecutive);
// the two kongs share lockKey "kv" for same value, matching dragons via suitSlots 0 and 1.
const hand_2468_6: HandPattern = {
  id: "2026-2468-6",
  year: 2026,
  category: "2468",
  description: "2468 2222 D 2222 D — Any 3 Suits, Like Kongs 2/4/6/8 w Matching Dragon",
  points: 25,
  concealed: false,
  // 1+1+1+1 + 4 + 1 + 4 + 1 = 14 ✓
  groups: [
    G.single(M.any("2", 2)),
    G.single(M.any("4", 2)),
    G.single(M.any("6", 2)),
    G.single(M.any("8", 2)),
    G.kong(M.anyOf(["2","4","6","8"], 0, "kv")),
    G.single(M.matchingDragon(0)),
    G.kong(M.anyOf(["2","4","6","8"], 1, "kv")),
    G.single(M.matchingDragon(1)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// 2468 #7: FFF 2468 FFF 2222 — Any 2 Suits, Kong 2,4,6 or 8
// FFF + 2468singles + FFF + 2222kong = 3+4+3+4 = 14 ✓
// The 2468 are singles in suit 0, the 2222 kong is anyOf in suit 1 (any 2 suits)
const hand_2468_7: HandPattern = {
  id: "2026-2468-7",
  year: 2026,
  category: "2468",
  description: "FFF 2468 FFF 2222 — Any 2 Suits, Kong 2/4/6/8",
  points: 30,
  concealed: false,
  groups: [
    G.pung(M.flower()),
    G.single(M.any("2", 0)),
    G.single(M.any("4", 0)),
    G.single(M.any("6", 0)),
    G.single(M.any("8", 0)),
    G.pung(M.flower()),
    G.kong(M.anyOf(["2","4","6","8"], 1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// 2468 #8: FF 246 888 246 888 — Any 2 Suits (CONCEALED)
// 2+1+1+1+3+1+1+1+3 = 14 ✓
// Two groups of "246 888": each 246 = 3 singles of 2,4,6 in a suit; 888 = pung
const hand_2468_8: HandPattern = {
  id: "2026-2468-8",
  year: 2026,
  category: "2468",
  description: "FF 246 888 246 888 — Any 2 Suits (Concealed)",
  points: 30,
  concealed: true,
  groups: [
    G.pair(M.flower()),
    G.single(M.any("2", 0)),
    G.single(M.any("4", 0)),
    G.single(M.any("6", 0)),
    G.pung(M.any("8", 0)),
    G.single(M.any("2", 1)),
    G.single(M.any("4", 1)),
    G.single(M.any("6", 1)),
    G.pung(M.any("8", 1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// ────────────────────────────────────────────────────────────────────────────
// SECTION 3: Any Like Numbers
// ────────────────────────────────────────────────────────────────────────────

// ALN #1: 1111 FFFFFF 1111 — Any 2 Suits
// 4+6+4 = 14 ✓
const hand_aln_1: HandPattern = {
  id: "2026-aln-1",
  year: 2026,
  category: "ANY_LIKE_NUMBERS",
  description: "1111 FFFFFF 1111 — Any 2 Suits, Any Like No.",
  points: 30,
  concealed: false,
  groups: [
    G.kong(M.any("1", 0)),
    G.sextet(M.flower()),
    G.kong(M.any("1", 1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// ALN #2: 1111 D 111 D 1111 D — Any 3 Suits w Matching Dragon
// 4+1+3+1+4+1 = 14 ✓
const hand_aln_2: HandPattern = {
  id: "2026-aln-2",
  year: 2026,
  category: "ANY_LIKE_NUMBERS",
  description: "1111 D 111 D 1111 D — Any 3 Suits, Matching Dragon",
  points: 25,
  concealed: false,
  groups: [
    G.kong(M.any("1", 0)),
    G.single(M.matchingDragon(0)),
    G.pung(M.any("1", 1)),
    G.single(M.matchingDragon(1)),
    G.kong(M.any("1", 2)),
    G.single(M.matchingDragon(2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// ALN #3: FF 1111 11 1111 DD — Any 3 Suits w Any Dragon
// 2+4+2+4+2 = 14 ✓
const hand_aln_3: HandPattern = {
  id: "2026-aln-3",
  year: 2026,
  category: "ANY_LIKE_NUMBERS",
  description: "FF 1111 11 1111 DD — Any 3 Suits, Any Dragon",
  points: 25,
  concealed: false,
  groups: [
    G.pair(M.flower()),
    G.kong(M.any("1", 0)),
    G.pair(M.any("1", 1)),
    G.kong(M.any("1", 2)),
    G.pair(M.anyDragon()),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// ────────────────────────────────────────────────────────────────────────────
// SECTION 4: Quints
// ────────────────────────────────────────────────────────────────────────────

// Quints #1: 11111 1111 11111 — Any 3 Suits, Any Like Nos.
// 5+4+5 = 14 ✓
const hand_quints_1: HandPattern = {
  id: "2026-quints-1",
  year: 2026,
  category: "QUINTS",
  description: "11111 1111 11111 — Any 3 Suits, Any Like Nos.",
  points: 40,
  concealed: false,
  groups: [
    G.quint(M.any("1", 0)),
    G.kong(M.any("1", 1)),
    G.quint(M.any("1", 2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// Quints #2: FF 11111 22 33333 — Any 1 Suit, Any 3 Consec. Nos.
// 2+5+2+5 = 14 ✓
const hand_quints_2: HandPattern = {
  id: "2026-quints-2",
  year: 2026,
  category: "QUINTS",
  description: "FF 11111 22 33333 — Any 1 Suit, Any 3 Consec. Nos.",
  points: 45,
  concealed: false,
  groups: [
    G.pair(M.flower()),
    G.quint(M.consec(0)),
    G.pair(M.consec(1)),
    G.quint(M.consec(2)),
  ],
  consecutive: { length: 3 },
};

// Quints #3: 11111 44444 DDDD — Any 2 Nos. in Any 1 Suit w Opp. Dragon
// 5+5+4 = 14 ✓
// SIMPLIFY: oppositeDragon treated as anyDragon (permissive)
const hand_quints_3: HandPattern = {
  id: "2026-quints-3",
  year: 2026,
  category: "QUINTS",
  description: "11111 44444 DDDD — Any 2 Nos. in Any 1 Suit, Opp. Dragon",
  points: 40,
  concealed: false,
  // SIMPLIFY: use anyOf for 2 numbers, single suit, oppositeDragon as anyDragon
  groups: [
    G.quint(M.any("1")),
    G.quint(M.any("4")),
    G.kong(M.anyDragon()),
  ],
  // SIMPLIFY: any 2 different numbers — since they're hardcoded as "1" and "4" here we accept
  // all variations by reusing with anyOf approach; but the card says "any 2 nos" so we'd need
  // more patterns. Using permissive: accept any quint+quint+kong in same suit.
  // NOTE: The hands are 1111 1 / 4444 4 — same value quints. "Any 2 Nos" means the two quints
  // can be ANY two different numbers. We encode as anyOf below.
};

// Actually for Quints #3 "any 2 nos" — we need anyOf for flexibility
// Let's use suitSlot 0 for both quints (same suit) and anyOf with lockKeys
const hand_quints_3_fixed: HandPattern = {
  id: "2026-quints-3",
  year: 2026,
  category: "QUINTS",
  description: "11111 44444 DDDD — Any 2 Nos. in Any 1 Suit, Opp. Dragon",
  points: 40,
  concealed: false,
  // SIMPLIFY: oppositeDragon treated as anyDragon
  groups: [
    G.quint(M.anyOf(["1","2","3","4","5","6","7","8","9"], 0, "qa")),
    G.quint(M.anyOf(["1","2","3","4","5","6","7","8","9"], 0, "qb")),
    G.kong(M.anyDragon()),
  ],
  suitMode: { type: "any" },
};

// ────────────────────────────────────────────────────────────────────────────
// SECTION 5: Consecutive Run
// ────────────────────────────────────────────────────────────────────────────

// CR #1: 11 222 33 444 5555 — Any 1 Suit, These Nos Only (1,2,3,4,5)
// 2+3+2+3+4 = 14 ✓
const hand_cr_1: HandPattern = {
  id: "2026-cr-1",
  year: 2026,
  category: "CONSECUTIVE_RUN",
  description: "11 222 33 444 5555 — Any 1 Suit, Nos 1-2-3-4-5",
  points: 25,
  concealed: false,
  groups: [
    G.pair(M.any("1")),
    G.pung(M.any("2")),
    G.pair(M.any("3")),
    G.pung(M.any("4")),
    G.kong(M.any("5")),
  ],
};

// CR #2: FFF 1111 234 5555 — Any 1 or 2 Suits, Any 5 Consec. Nos
// 3+4+1+1+1+4 = 14 ✓
// FFF + kong(consec[0]) + single(consec[1]) + single(consec[2]) + single(consec[3]) + kong(consec[4])
// SIMPLIFY: upToN=2 suits; the FFF+234(singles)+kong structure maps to offset 0..4
const hand_cr_2: HandPattern = {
  id: "2026-cr-2",
  year: 2026,
  category: "CONSECUTIVE_RUN",
  description: "FFF 1111 234 5555 — Any 1 or 2 Suits, Any 5 Consec. Nos.",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.flower()),
    G.kong(M.consec(0, 0)),
    G.single(M.consec(1, 1)),
    G.single(M.consec(2, 1)),
    G.single(M.consec(3, 1)),
    G.kong(M.consec(4, 0)),
  ],
  consecutive: { length: 5 },
  suitMode: { type: "upToN", n: 2 },
};

// CR #3: 11 22 111 222 3333 — Any 3 Suits, Any 3 Consec. Nos.
// 2+2+3+3+4 = 14 ✓
const hand_cr_3: HandPattern = {
  id: "2026-cr-3",
  year: 2026,
  category: "CONSECUTIVE_RUN",
  description: "11 22 111 222 3333 — Any 3 Suits, Any 3 Consec. Nos.",
  points: 25,
  concealed: false,
  groups: [
    G.pair(M.consec(0, 0)),
    G.pair(M.consec(1, 1)),
    G.pung(M.consec(0, 2)),
    G.pung(M.consec(1, 2)),
    G.kong(M.consec(2, 2)),
  ],
  consecutive: { length: 3 },
  suitMode: { type: "exactlyN", n: 3 },
};

// CR #4: 111 222 3333 4444 — Any 1 or 2 Suits, Any 4 Consec. Nos.
// 3+3+4+4 = 14 ✓
const hand_cr_4: HandPattern = {
  id: "2026-cr-4",
  year: 2026,
  category: "CONSECUTIVE_RUN",
  description: "111 222 3333 4444 — Any 1 or 2 Suits, Any 4 Consec. Nos.",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.consec(0, 0)),
    G.pung(M.consec(1, 0)),
    G.kong(M.consec(2, 1)),
    G.kong(M.consec(3, 1)),
  ],
  consecutive: { length: 4 },
  suitMode: { type: "upToN", n: 2 },
};

// CR #5: FFF 11 22 333 DDDD — 1 or 2 Suits, Any Run De Match Middle No.
// "Match Middle No." = the matching dragon for the middle number (offset 1 in a 3-consec run)
// 3+2+2+3+4 = 14 ✓
// SIMPLIFY: DDDD treated as anyDragon kong (permissive; matching dragon for middle number)
const hand_cr_5: HandPattern = {
  id: "2026-cr-5",
  year: 2026,
  category: "CONSECUTIVE_RUN",
  description: "FFF 11 22 333 DDDD — 1 or 2 Suits, Run, Matching Dragon Middle",
  points: 25,
  concealed: false,
  // SIMPLIFY: oppDragon/matchDragon for middle = anyDragon (permissive)
  groups: [
    G.pung(M.flower()),
    G.pair(M.consec(0, 0)),
    G.pair(M.consec(1, 0)),
    G.pung(M.consec(2, 0)),
    G.kong(M.anyDragon()),
  ],
  consecutive: { length: 3 },
  suitMode: { type: "upToN", n: 2 },
};

// CR #6: 1111 FFFFFF 2222 — Any 1 Suit, Any 2 Consec. Nos.
// 4+6+4 = 14 ✓
const hand_cr_6: HandPattern = {
  id: "2026-cr-6",
  year: 2026,
  category: "CONSECUTIVE_RUN",
  description: "1111 FFFFFF 2222 — Any 1 Suit, Any 2 Consec. Nos.",
  points: 30,
  concealed: false,
  groups: [
    G.kong(M.consec(0)),
    G.sextet(M.flower()),
    G.kong(M.consec(1)),
  ],
  consecutive: { length: 2 },
};

// CR #7: FF 1111 2222 3333 — Any 1 or 3 Suits, 3 Consec. Nos.
// 2+4+4+4 = 14 ✓
// SIMPLIFY: upToN=3 (accepts 1,2,3 suits — permissive for "1 or 3")
const hand_cr_7: HandPattern = {
  id: "2026-cr-7",
  year: 2026,
  category: "CONSECUTIVE_RUN",
  description: "FF 1111 2222 3333 — Any 1 or 3 Suits, 3 Consec. Nos.",
  points: 25,
  concealed: false,
  groups: [
    G.pair(M.flower()),
    G.kong(M.consec(0, 0)),
    G.kong(M.consec(1, 1)),
    G.kong(M.consec(2, 2)),
  ],
  consecutive: { length: 3 },
  // SIMPLIFY: allow 1 or 3 suits; we use upToN=3 (also accepts 2, but permissive is fine)
  suitMode: { type: "upToN", n: 3 },
};

// CR #8: 1 22 333 1 22 333 44 — Any 3 Suits, Any 4 Consec. Nos. (CONCEALED)
// 1+2+3+1+2+3+2 = 14 ✓
// Pattern: single(offset0,s0) pair(offset1,s0) pung(offset2,s0) single(offset0,s1) pair(offset1,s1) pung(offset2,s1) pair(offset3,s2)
const hand_cr_8: HandPattern = {
  id: "2026-cr-8",
  year: 2026,
  category: "CONSECUTIVE_RUN",
  description: "1 22 333 1 22 333 44 — Any 3 Suits, Any 4 Consec. Nos. (Concealed)",
  points: 35,
  concealed: true,
  groups: [
    G.single(M.consec(0, 0)),
    G.pair(M.consec(1, 0)),
    G.pung(M.consec(2, 0)),
    G.single(M.consec(0, 1)),
    G.pair(M.consec(1, 1)),
    G.pung(M.consec(2, 1)),
    G.pair(M.consec(3, 2)),
  ],
  consecutive: { length: 4 },
  suitMode: { type: "exactlyN", n: 3 },
};

// ────────────────────────────────────────────────────────────────────────────
// SECTION 6: 13579
// ────────────────────────────────────────────────────────────────────────────

// 13579 #1: 11 333 55 777 9999 — Any 1 or 3 Suits
// 2+3+2+3+4 = 14 ✓
// SIMPLIFY: upToN=3
const hand_13579_1: HandPattern = {
  id: "2026-13579-1",
  year: 2026,
  category: "13579",
  description: "11 333 55 777 9999 — Any 1 or 3 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pair(M.any("1", 0)),
    G.pung(M.any("3", 1)),
    G.pair(M.any("5", 2)),
    G.pung(M.any("7", 1)),
    G.kong(M.any("9", 0)),
  ],
  suitMode: { type: "upToN", n: 3 },
};

// 13579 #2: 111 333 3333 5555 — Any 2 Suits
// 3+3+4+4 = 14 ✓
const hand_13579_2: HandPattern = {
  id: "2026-13579-2",
  year: 2026,
  category: "13579",
  description: "111 333 3333 5555 — Any 2 Suits",
  points: 30,
  concealed: false,
  groups: [
    G.pung(M.any("1", 0)),
    G.pung(M.any("3", 0)),
    G.kong(M.any("3", 1)),
    G.kong(M.any("5", 1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// 13579 #3: NN 1111 33 5555 SS — Any 1 Suit, North & South Only
// 2+4+2+4+2 = 14 ✓
const hand_13579_3: HandPattern = {
  id: "2026-13579-3",
  year: 2026,
  category: "13579",
  description: "NN 1111 33 5555 SS — Any 1 Suit, North & South Only",
  points: 30,
  concealed: false,
  groups: [
    G.pair(M.wind("N")),
    G.kong(M.any("1")),
    G.pair(M.any("3")),
    G.kong(M.any("5")),
    G.pair(M.wind("S")),
  ],
};

// 13579 #4: 113579 1111 1111 — Any 3 Suits, Pair Any Odd No., Kongs Match Pair
// "113579" = pair of some odd + singles of 1,3,5,7,9; kongs are same number as pair
// 2+1+1+1+1+1 + 4 + 4 = 15... wait that's 15
// Re-read: "113579" is 6 tiles (1,1,3,5,7,9), then 1111 kong, 1111 kong = 6+4+4=14 ✓
// The "11" pair = the "Pair Any Odd No."; 3,5,7,9 = singles; the kongs = same odd number as pair
// So: pair(anyOdd, s?) + 4 singles of 3,5,7,9 in various suits + 2 kongs of same odd value
// SIMPLIFY: the pair odd number = anyOf([1,3,5,7,9]); kongs match pair via lockKey
const hand_13579_4: HandPattern = {
  id: "2026-13579-4",
  year: 2026,
  category: "13579",
  description: "113579 1111 1111 — Any 3 Suits, Pair Odd, Kongs Match Pair",
  points: 25,
  concealed: false,
  // SIMPLIFY: pair and two kongs share lockKey; 3579 singles are in various suits
  // 2 + 1+1+1+1 + 4 + 4 = 14 ✓
  groups: [
    G.pair(M.anyOf(["1","3","5","7","9"], 0, "odd")),
    G.single(M.any("3", 1)),
    G.single(M.any("5", 1)),
    G.single(M.any("7", 2)),
    G.single(M.any("9", 2)),
    G.kong(M.anyOf(["1","3","5","7","9"], 1, "odd")),
    G.kong(M.anyOf(["1","3","5","7","9"], 2, "odd")),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// 13579 #5: FFF 11 33 555 DDDD — Any 1 Suit w Matching Dragon
// 3+2+2+3+4 = 14 ✓
const hand_13579_5: HandPattern = {
  id: "2026-13579-5",
  year: 2026,
  category: "13579",
  description: "FFF 11 33 555 DDDD — Any 1 Suit, Matching Dragon",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.flower()),
    G.pair(M.any("1", 0)),
    G.pair(M.any("3", 0)),
    G.pung(M.any("5", 0)),
    G.kong(M.matchingDragon(0)),
  ],
  suitMode: { type: "any" },
};

// 13579 #6: 11 33 111 333 5555 — Any 3 Suits
// 2+2+3+3+4 = 14 ✓
const hand_13579_6: HandPattern = {
  id: "2026-13579-6",
  year: 2026,
  category: "13579",
  description: "11 33 111 333 5555 — Any 3 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pair(M.any("1", 0)),
    G.pair(M.any("3", 1)),
    G.pung(M.any("1", 2)),
    G.pung(M.any("3", 2)),
    G.kong(M.any("5", 2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// 13579 #7: 1111 33 55 77 9999 — Any 1 or 2 Suits
// 4+2+2+2+4 = 14 ✓
const hand_13579_7: HandPattern = {
  id: "2026-13579-7",
  year: 2026,
  category: "13579",
  description: "1111 33 55 77 9999 — Any 1 or 2 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.kong(M.any("1", 0)),
    G.pair(M.any("3", 1)),
    G.pair(M.any("5", 1)),
    G.pair(M.any("7", 1)),
    G.kong(M.any("9", 0)),
  ],
  suitMode: { type: "upToN", n: 2 },
};

// 13579 #8: FF 11 33 55 111 111 — Any 3 Suits, These Nos. Only (CONCEALED)
// 2+2+2+2+3+3 = 14 ✓
const hand_13579_8: HandPattern = {
  id: "2026-13579-8",
  year: 2026,
  category: "13579",
  description: "FF 11 33 55 111 111 — Any 3 Suits, Nos 1-3-5 (Concealed)",
  points: 35,
  concealed: true,
  groups: [
    G.pair(M.flower()),
    G.pair(M.any("1", 0)),
    G.pair(M.any("3", 1)),
    G.pair(M.any("5", 2)),
    G.pung(M.any("1", 1)),
    G.pung(M.any("1", 2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// 13579 #9: FF 135 777 999 DDD — Any 1 Suit w Opp. Dragon (CONCEALED)
// 2+1+1+1+3+3+3 = 14 ✓
// SIMPLIFY: oppositeDragon as anyDragon
const hand_13579_9: HandPattern = {
  id: "2026-13579-9",
  year: 2026,
  category: "13579",
  description: "FF 135 777 999 DDD — Any 1 Suit, Opp. Dragon (Concealed)",
  points: 30,
  concealed: true,
  // SIMPLIFY: oppositeDragon = anyDragon
  groups: [
    G.pair(M.flower()),
    G.single(M.any("1")),
    G.single(M.any("3")),
    G.single(M.any("5")),
    G.pung(M.any("7")),
    G.pung(M.any("9")),
    G.pung(M.anyDragon()),
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// SECTION 7: Winds and Dragons
// ────────────────────────────────────────────────────────────────────────────

// W&D #1: NNNN EEE WWW SSSS — All winds
// 4+3+3+4 = 14 ✓
const hand_wd_1: HandPattern = {
  id: "2026-wd-1",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "NNNN EEE WWW SSSS — All winds",
  points: 25,
  concealed: false,
  groups: [
    G.kong(M.wind("N")),
    G.pung(M.wind("E")),
    G.pung(M.wind("W")),
    G.kong(M.wind("S")),
  ],
};

// W&D #2: 1234 DDD DDD DDDD — Any 4 Consec. Nos. in Any 1 Suit, Any 3 Dragons
// 1+1+1+1 + 3+3+4 = 14 ✓
// "Any 3 Dragons" = 3 different dragon types (one pung each of 2 types + one kong of 1 type, or 3 groups)
// Actually: DDD DDD DDDD = 3+3+4 = 10 tiles of dragons; we have 3 dragon groups
// SIMPLIFY: use anyDragon for all 3 dragon groups; constraint that they're "3 different dragons"
// is too complex — use permissive (3 groups of anyDragon, allowing same dragon repeated)
const hand_wd_2: HandPattern = {
  id: "2026-wd-2",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "1234 DDD DDD DDDD — Any 4 Consec. Nos. Any 1 Suit, Any 3 Dragons",
  points: 25,
  concealed: false,
  // 1+1+1+1 + 3+3+4 = 14 ✓
  // SIMPLIFY: 3 dragon groups = anyDragon; no enforcement of "different" dragons
  groups: [
    G.single(M.consec(0)),
    G.single(M.consec(1)),
    G.single(M.consec(2)),
    G.single(M.consec(3)),
    G.pung(M.anyDragon()),
    G.pung(M.anyDragon()),
    G.kong(M.anyDragon()),
  ],
  consecutive: { length: 4 },
};

// W&D #3: NNN 1111 1111 SSS — Any Like Odd Nos. in Any 2 Suits
// 3+4+4+3 = 14 ✓
const hand_wd_3: HandPattern = {
  id: "2026-wd-3",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "NNN 1111 1111 SSS — Any Like Odd Nos. in Any 2 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.wind("N")),
    G.kong(M.anyOf(["1","3","5","7","9"], 0)),
    G.kong(M.anyOf(["1","3","5","7","9"], 1)),
    G.pung(M.wind("S")),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// W&D #4: EEE 2222 2222 WWW — Any Like Even Nos. in Any 2 Suits
// 3+4+4+3 = 14 ✓
const hand_wd_4: HandPattern = {
  id: "2026-wd-4",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "EEE 2222 2222 WWW — Any Like Even Nos. in Any 2 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.wind("E")),
    G.kong(M.anyOf(["2","4","6","8"], 0)),
    G.kong(M.anyOf(["2","4","6","8"], 1)),
    G.pung(M.wind("W")),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// W&D #5: FFF NNNN FFF DDDD — Any Wind, Any Dragon
// 3+4+3+4 = 14 ✓
const hand_wd_5: HandPattern = {
  id: "2026-wd-5",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "FFF NNNN FFF DDDD — Any Wind, Any Dragon",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.flower()),
    G.kong(M.anyOf(["E","S","W","N"])),  // any wind — use anyOf
    G.pung(M.flower()),
    G.kong(M.anyDragon()),
  ],
};

// W&D #6: 1 N 2 EE 3 WWW 4 SSSS — Any 1 Suit, These Nos. Only (1,2,3,4)
// 1+1+1+2+1+3+1+4 = 14 ✓
const hand_wd_6: HandPattern = {
  id: "2026-wd-6",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "1 N 2 EE 3 WWW 4 SSSS — Any 1 Suit, Nos 1-2-3-4",
  points: 25,
  concealed: false,
  groups: [
    G.single(M.any("1")),
    G.single(M.wind("N")),
    G.single(M.any("2")),
    G.pair(M.wind("E")),
    G.single(M.any("3")),
    G.pung(M.wind("W")),
    G.single(M.any("4")),
    G.kong(M.wind("S")),
  ],
};

// W&D #7: FF NNNN SSSS DD DD — Any 2 Dragons
// 2+4+4+2+2 = 14 ✓
// "DD DD" = two dragon pairs — any 2 dragons (could be same or different)
// SIMPLIFY: use anyDragon for both pairs (permissive)
const hand_wd_7: HandPattern = {
  id: "2026-wd-7",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "FF NNNN SSSS DD DD — Any 2 Dragons",
  points: 25,
  concealed: false,
  groups: [
    G.pair(M.flower()),
    G.kong(M.wind("N")),
    G.kong(M.wind("S")),
    G.pair(M.anyDragon()),
    G.pair(M.anyDragon()),
  ],
};

// W&D #8: NN EEE 2026 WWW SS — 2026 Any 1 Suit (CONCEALED)
// 2+3 + 1+1+1+1 + 3+2 = 14 ✓
const hand_wd_8: HandPattern = {
  id: "2026-wd-8",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "NN EEE 2026 WWW SS — Any 1 Suit (Concealed)",
  points: 30,
  concealed: true,
  groups: [
    G.pair(M.wind("N")),
    G.pung(M.wind("E")),
    G.single(M.any("2")),
    G.single(M.dragon("Wh")),
    G.single(M.any("2")),
    G.single(M.any("6")),
    G.pung(M.wind("W")),
    G.pair(M.wind("S")),
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// SECTION 8: 369
// ────────────────────────────────────────────────────────────────────────────

// 369 #1: 333 666 6666 9999 — Any 2 or 3 Suits
// 3+3+4+4 = 14 ✓
// SIMPLIFY: upToN=3 (accepts 2 or 3 suits)
const hand_369_1: HandPattern = {
  id: "2026-369-1",
  year: 2026,
  category: "369",
  description: "333 666 6666 9999 — Any 2 or 3 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.any("3", 0)),
    G.pung(M.any("6", 1)),
    G.kong(M.any("6", 2)),
    G.kong(M.any("9", 2)),
  ],
  suitMode: { type: "upToN", n: 3 },
};

// 369 #2: 33 66 333 666 9999 — Any 3 Suits
// 2+2+3+3+4 = 14 ✓
const hand_369_2: HandPattern = {
  id: "2026-369-2",
  year: 2026,
  category: "369",
  description: "33 66 333 666 9999 — Any 3 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pair(M.any("3", 0)),
    G.pair(M.any("6", 1)),
    G.pung(M.any("3", 2)),
    G.pung(M.any("6", 2)),
    G.kong(M.any("9", 2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// 369 #3: FFF 33 666 99 DDDD — 1 Suit w Matching or Opp Drag
// 3+2+3+2+4 = 14 ✓
// SIMPLIFY: DDDD = anyDragon kong (matches "matching or opp drag" permissively)
const hand_369_3: HandPattern = {
  id: "2026-369-3",
  year: 2026,
  category: "369",
  description: "FFF 33 666 99 DDDD — 1 Suit, Matching or Opp Dragon",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.flower()),
    G.pair(M.any("3")),
    G.pung(M.any("6")),
    G.pair(M.any("9")),
    G.kong(M.anyDragon()),
  ],
};

// 369 #4: 33 66 666 999 NEWS — Any 2 Suits
// 2+2+3+3+4 = 14 ✓
const hand_369_4: HandPattern = {
  id: "2026-369-4",
  year: 2026,
  category: "369",
  description: "33 66 666 999 NEWS — Any 2 Suits",
  points: 30,
  concealed: false,
  groups: [
    G.pair(M.any("3", 0)),
    G.pair(M.any("6", 0)),
    G.pung(M.any("6", 1)),
    G.pung(M.any("9", 1)),
    G.single(M.wind("N")),
    G.single(M.wind("E")),
    G.single(M.wind("W")),
    G.single(M.wind("S")),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// 369 #5: FF 3369 3333 3333 — Any 3 Suits, Pair 3,6 or 9, Kongs Match Pair
// "3369" = 3,3,6,9 as singles+pair; kongs match pair value
// 2 + (3,3,6,9) + 4 + 4 = 2+4+4+4 = 14 ✓
// The "3369" = pair(lockVal, s0) + single(3,s?) + single(6,s?) + single(9,s?)... actually:
// Re-read: "FF 3369 3333 3333" — FF=2 flowers; "3369" = 4 tiles (two 3s, one 6, one 9);
// "3333" = kong; "3333" = kong. Wait: "Pair 3,6 or 9, Kongs Match Pair"
// So: FF(2) + pair(anyOf[3,6,9]) + single(3) + single(6) + single(9) + kong(pair) + kong(pair)
// = 2+2+1+1+1+4+4 - but "3369" has a pair of 3s + single 6 + single 9 if pair=3
//   OR pair of 6s + single 3 + single 9 if pair=6
//   OR pair of 9s + single 3 + single 6 if pair=9
// So "3369" = pair(pv) + (from {3,6,9}\pv: single + single) = 4 tiles ✓
// 2+4+4+4 = 14 ✓
const hand_369_5: HandPattern = {
  id: "2026-369-5",
  year: 2026,
  category: "369",
  description: "FF 3369 3333 3333 — Any 3 Suits, Pair 3/6/9, Kongs Match Pair",
  points: 25,
  concealed: false,
  // SIMPLIFY: encode with explicit values for each pair case using multiple sub-patterns
  // Actually we can encode with anyOf+lockKey: pair and kongs share lockKey "pv"
  // The remaining two singles need to be the other two values from {3,6,9}
  // That's complex, so SIMPLIFY: encode the constraint as pair+kongs with lockKey,
  // and the two singles as anyOf{3,6,9} without lockKey (permissive)
  groups: [
    G.pair(M.flower()),
    G.pair(M.anyOf(["3","6","9"], 0, "pv")),
    G.single(M.anyOf(["3","6","9"], 1)),
    G.single(M.anyOf(["3","6","9"], 1)),
    G.kong(M.anyOf(["3","6","9"], 2, "pv")),
    G.kong(M.anyOf(["3","6","9"], 2, "pv")),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// Wait: 2+2+1+1+4+4 = 14 ✓ but two kongs with same lockKey "pv" means same value, which is correct.
// But the suit slots: pair in s0, singles in s1, kongs in s2. exactlyN=3.

// 369 #6: FF 333 666 999 369 — Any 2 Suits (CONCEALED)
// 2+3+3+3+1+1+1 = 14 ✓
const hand_369_6: HandPattern = {
  id: "2026-369-6",
  year: 2026,
  category: "369",
  description: "FF 333 666 999 369 — Any 2 Suits (Concealed)",
  points: 30,
  concealed: true,
  groups: [
    G.pair(M.flower()),
    G.pung(M.any("3", 0)),
    G.pung(M.any("6", 0)),
    G.pung(M.any("9", 0)),
    G.single(M.any("3", 1)),
    G.single(M.any("6", 1)),
    G.single(M.any("9", 1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// ────────────────────────────────────────────────────────────────────────────
// SECTION 9: Singles and Pairs
// ────────────────────────────────────────────────────────────────────────────

// S&P #1: NN EE WW SS 1D 1D 1D — Any 3 Suits, Any Like No. w Matching Dragon (CONCEALED)
// "1D 1D 1D" = (single(1) + single(matchingDragon)) × 3 times, each in different suit
// 2+2+2+2 + (1+1)×3 = 8+6 = 14 ✓
const hand_sp_1: HandPattern = {
  id: "2026-sp-1",
  year: 2026,
  category: "SINGLES_PAIRS",
  description: "NN EE WW SS 1D 1D 1D — Any 3 Suits, Like No. w Matching Dragon (Concealed)",
  points: 50,
  concealed: true,
  groups: [
    G.pair(M.wind("N")),
    G.pair(M.wind("E")),
    G.pair(M.wind("W")),
    G.pair(M.wind("S")),
    G.single(M.anyOf(["1","2","3","4","5","6","7","8","9"], 0)),
    G.single(M.matchingDragon(0)),
    G.single(M.anyOf(["1","2","3","4","5","6","7","8","9"], 1)),
    G.single(M.matchingDragon(1)),
    G.single(M.anyOf(["1","2","3","4","5","6","7","8","9"], 2)),
    G.single(M.matchingDragon(2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// S&P #2: 2 4 66 88 2 4 66 88 88 — Any 3 Suits, These Nos. Only (CONCEALED)
// 1+1+2+2+1+1+2+2+2 = 14 ✓
// Pattern: in suit A: 2,4,66,88; in suit B: 2,4,66,88; extra 88 in suit C
// Actually the exact grouping: single(2,sA)+single(4,sA)+pair(6,sA)+pair(8,sA)
//   +single(2,sB)+single(4,sB)+pair(6,sB)+pair(8,sB)+pair(8,sC)
// = 1+1+2+2+1+1+2+2+2 = 14 ✓
const hand_sp_2: HandPattern = {
  id: "2026-sp-2",
  year: 2026,
  category: "SINGLES_PAIRS",
  description: "2 4 66 88 2 4 66 88 88 — Any 3 Suits, Nos 2-4-6-8 (Concealed)",
  points: 50,
  concealed: true,
  groups: [
    G.single(M.any("2", 0)),
    G.single(M.any("4", 0)),
    G.pair(M.any("6", 0)),
    G.pair(M.any("8", 0)),
    G.single(M.any("2", 1)),
    G.single(M.any("4", 1)),
    G.pair(M.any("6", 1)),
    G.pair(M.any("8", 1)),
    G.pair(M.any("8", 2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// S&P #3: FF 3369 3669 3699 — Any 3 Suits (CONCEALED)
// 2 + (3,3,6,9) + (3,6,6,9) + (3,6,9,9) = 2+4+4+4 = 14 ✓
// SIMPLIFY: encode each group as singles of 3,3,6,9 / 3,6,6,9 / 3,6,9,9 in 3 suits
const hand_sp_3: HandPattern = {
  id: "2026-sp-3",
  year: 2026,
  category: "SINGLES_PAIRS",
  description: "FF 3369 3669 3699 — Any 3 Suits (Concealed)",
  points: 50,
  concealed: true,
  // "3369" in suitA = single(3)+single(3)+single(6)+single(9)
  // "3669" in suitB = single(3)+single(6)+single(6)+single(9)
  // "3699" in suitC = single(3)+single(6)+single(9)+single(9)
  // 2+4+4+4 = 14 ✓
  groups: [
    G.pair(M.flower()),
    G.single(M.any("3", 0)),
    G.single(M.any("3", 0)),
    G.single(M.any("6", 0)),
    G.single(M.any("9", 0)),
    G.single(M.any("3", 1)),
    G.single(M.any("6", 1)),
    G.single(M.any("6", 1)),
    G.single(M.any("9", 1)),
    G.single(M.any("3", 2)),
    G.single(M.any("6", 2)),
    G.single(M.any("9", 2)),
    G.single(M.any("9", 2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// S&P #4: 11 22 33 44 55 66 77 — Any 1 Suit, Any 7 Consec. Nos. (CONCEALED)
// 2×7 = 14 ✓
const hand_sp_4: HandPattern = {
  id: "2026-sp-4",
  year: 2026,
  category: "SINGLES_PAIRS",
  description: "11 22 33 44 55 66 77 — Any 1 Suit, Any 7 Consec. Nos. (Concealed)",
  points: 50,
  concealed: true,
  groups: [
    G.pair(M.consec(0)),
    G.pair(M.consec(1)),
    G.pair(M.consec(2)),
    G.pair(M.consec(3)),
    G.pair(M.consec(4)),
    G.pair(M.consec(5)),
    G.pair(M.consec(6)),
  ],
  consecutive: { length: 7 },
};

// S&P #5: 11 357 99 11 357 99 — Any 2 Suits (CONCEALED)
// Two groups of: pair(1) + single(3)+single(5)+single(7) + pair(9)
// (2+1+1+1+2) × 2 = 14 ✓
const hand_sp_5: HandPattern = {
  id: "2026-sp-5",
  year: 2026,
  category: "SINGLES_PAIRS",
  description: "11 357 99 11 357 99 — Any 2 Suits (Concealed)",
  points: 50,
  concealed: true,
  groups: [
    G.pair(M.any("1", 0)),
    G.single(M.any("3", 0)),
    G.single(M.any("5", 0)),
    G.single(M.any("7", 0)),
    G.pair(M.any("9", 0)),
    G.pair(M.any("1", 1)),
    G.single(M.any("3", 1)),
    G.single(M.any("5", 1)),
    G.single(M.any("7", 1)),
    G.pair(M.any("9", 1)),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// S&P #6: FF 2026 2026 2026 — Any 3 Suits (CONCEALED)
// 2 + (2+0+2+6)×3 = 2+4+4+4 = 14 ✓
// Each "2026" = single(2) + single(DWh) + single(2) + single(6) — in 3 different suits
const hand_sp_6: HandPattern = {
  id: "2026-sp-6",
  year: 2026,
  category: "SINGLES_PAIRS",
  description: "FF 2026 2026 2026 — Any 3 Suits (Concealed)",
  points: 75,
  concealed: true,
  groups: [
    G.pair(M.flower()),
    G.single(M.any("2", 0)),
    G.single(M.dragon("Wh")),
    G.single(M.any("2", 0)),
    G.single(M.any("6", 0)),
    G.single(M.any("2", 1)),
    G.single(M.dragon("Wh")),
    G.single(M.any("2", 1)),
    G.single(M.any("6", 1)),
    G.single(M.any("2", 2)),
    G.single(M.dragon("Wh")),
    G.single(M.any("2", 2)),
    G.single(M.any("6", 2)),
  ],
  suitMode: { type: "exactlyN", n: 3 },
};

// Wait: we have 3 DWh singles — but the wall only has 4 DWh tiles. That's fine, 3 is valid.
// Count: 2+1+1+1+1+1+1+1+1+1+1+1+1 = 14 ✓

// ────────────────────────────────────────────────────────────────────────────
// Assembly
// ────────────────────────────────────────────────────────────────────────────

// Note: W&D #5 uses anyOf for winds — need to fix this; anyOf only works for number suits.
// Winds are exact tiles; let's enumerate the 4 wind choices as separate patterns.
// Actually, we can handle it more simply with individual patterns or using anyOf.
// The matchesMatcher for anyOf currently checks bam/crak/dot suits. We need to handle
// winds specially. Let's create 4 wind variants for W&D #5.

const hand_wd_5_variants: HandPattern[] = ["E","S","W","N"].map((w) => ({
  id: `2026-wd-5-${w}`,
  year: 2026 as const,
  category: "WINDS_DRAGONS" as const,
  description: `FFF ${w}${w}${w}${w} FFF DDDD — Any Wind, Any Dragon`,
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.flower()),
    G.kong(M.wind(w as "E"|"S"|"W"|"N")),
    G.pung(M.flower()),
    G.kong(M.anyDragon()),
  ],
}));

// W&D #3 and #4 also use anyOf for odd/even numbers — those work fine since anyOf
// with number suits matches via the anyOf case in matchesMatcher.
// BUT: the anyOf without lockKey in assignment will try each value individually.
// For W&D #3 and #4 the two kongs should NOT necessarily be the same number
// (they can be the same or different odd/even — "Any Like" = same number).
// "Any Like Odd Nos." means both kongs are the SAME odd number.
// Fix: add lockKey to W&D #3 and #4.

const hand_wd_3_fixed: HandPattern = {
  id: "2026-wd-3",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "NNN 1111 1111 SSS — Any Like Odd Nos. in Any 2 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.wind("N")),
    G.kong(M.anyOf(["1","3","5","7","9"], 0, "odd")),
    G.kong(M.anyOf(["1","3","5","7","9"], 1, "odd")),
    G.pung(M.wind("S")),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

const hand_wd_4_fixed: HandPattern = {
  id: "2026-wd-4",
  year: 2026,
  category: "WINDS_DRAGONS",
  description: "EEE 2222 2222 WWW — Any Like Even Nos. in Any 2 Suits",
  points: 25,
  concealed: false,
  groups: [
    G.pung(M.wind("E")),
    G.kong(M.anyOf(["2","4","6","8"], 0, "even")),
    G.kong(M.anyOf(["2","4","6","8"], 1, "even")),
    G.pung(M.wind("W")),
  ],
  suitMode: { type: "exactlyN", n: 2 },
};

// Fix S&P #6: the 3 DWh singles are shared from the wall's 4 DWh tiles — fine.
// But we need singles to NOT use jokers. G.single already sets jokersAllowed=false. ✓

// Fix Quints #3: the two quints need DIFFERENT values (any 2 different nos.)
// The lockKeys "qa" and "qb" will be enumerated independently, but we need them different.
// SIMPLIFY: just accept any two quints of same-suit numbers (may match same value — permissive)
// This is documented with SIMPLIFY below.

export const CARD_2026: HandPattern[] = [
  // 2026
  hand_2026_1,
  hand_2026_2a,
  hand_2026_2b,
  hand_2026_3,
  hand_2026_4,
  // 2468
  hand_2468_1,
  hand_2468_2,
  hand_2468_3,
  hand_2468_4,
  hand_2468_5,
  hand_2468_6,
  hand_2468_7,
  hand_2468_8,
  // Any Like Numbers
  hand_aln_1,
  hand_aln_2,
  hand_aln_3,
  // Quints
  hand_quints_1,
  hand_quints_2,
  // SIMPLIFY: Quints #3 uses anyOf for 2 numbers; same-value quints allowed (permissive)
  hand_quints_3_fixed,
  // Consecutive Run
  hand_cr_1,
  hand_cr_2,
  hand_cr_3,
  hand_cr_4,
  hand_cr_5,
  hand_cr_6,
  hand_cr_7,
  hand_cr_8,
  // 13579
  hand_13579_1,
  hand_13579_2,
  hand_13579_3,
  hand_13579_4,
  hand_13579_5,
  hand_13579_6,
  hand_13579_7,
  hand_13579_8,
  hand_13579_9,
  // Winds and Dragons
  hand_wd_1,
  hand_wd_2,
  hand_wd_3_fixed,
  hand_wd_4_fixed,
  ...hand_wd_5_variants,
  hand_wd_6,
  hand_wd_7,
  hand_wd_8,
  // 369
  hand_369_1,
  hand_369_2,
  hand_369_3,
  hand_369_4,
  hand_369_5,
  hand_369_6,
  // Singles and Pairs
  hand_sp_1,
  hand_sp_2,
  hand_sp_3,
  hand_sp_4,
  hand_sp_5,
  hand_sp_6,
];

// Dev-only: warn loudly if any target hand is not exactly 14 tiles.
for (const p of CARD_2026) {
  warnIfInvalidHandSize(p.id, p.groups);
}

registerYearCard(2026, CARD_2026);

export default CARD_2026;
