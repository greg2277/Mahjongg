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

export const CURRENT_CARD_YEAR = 2026;

export type NumSuit = "B" | "C" | "D";

// NMJL dragon mapping: Craks=Red, Bams=Green, Dots=White
function matchingDragonCode(suit: NumSuit): string {
  if (suit === "C") return "DR";
  if (suit === "B") return "DG";
  return "DWh"; // D (dots) -> White/Soap
}

export type Matcher =
  | { kind: "exact"; code: string }
  | { kind: "anySuit"; value: string; suitSlot?: number }
  | { kind: "flower" }
  | { kind: "anyDragon" }
  | { kind: "matchingDragon"; suitSlot?: number }
  | { kind: "oppositeDragon"; suitSlot?: number }  // SIMPLIFY: treated as anyDragon
  | { kind: "consec"; offset: number; suitSlot?: number }
  | { kind: "anyOf"; values: string[]; suitSlot?: number; lockKey?: string };

export type SuitMode =
  | { type: "exactlyN"; n: number }
  | { type: "upToN"; n: number }
  | { type: "any" };

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
  consecutive?: { length: number };
  suitMode?: SuitMode;
};

const pung = (m: Matcher): Group => ({ count: 3, match: m, jokersAllowed: true });
const kong = (m: Matcher): Group => ({ count: 4, match: m, jokersAllowed: true });
const quint = (m: Matcher): Group => ({ count: 5, match: m, jokersAllowed: true });
const sextet = (m: Matcher): Group => ({ count: 6, match: m, jokersAllowed: true });
const pair = (m: Matcher): Group => ({ count: 2, match: m, jokersAllowed: false });
const single = (m: Matcher): Group => ({ count: 1, match: m, jokersAllowed: false });
const exact = (code: string): Matcher => ({ kind: "exact", code });
const any = (value: string, suitSlot?: number): Matcher =>
  suitSlot !== undefined ? { kind: "anySuit", value, suitSlot } : { kind: "anySuit", value };
const flower = (): Matcher => ({ kind: "flower" });
const anyDragon = (): Matcher => ({ kind: "anyDragon" });
const matchingDragon = (suitSlot?: number): Matcher =>
  suitSlot !== undefined ? { kind: "matchingDragon", suitSlot } : { kind: "matchingDragon" };
const anyOf = (values: string[], suitSlot?: number, lockKey?: string): Matcher => {
  const m: Matcher = { kind: "anyOf", values };
  if (suitSlot !== undefined) (m as { suitSlot?: number }).suitSlot = suitSlot;
  if (lockKey !== undefined) (m as { lockKey?: string }).lockKey = lockKey;
  return m;
};
const consec = (offset: number, suitSlot?: number): Matcher =>
  suitSlot !== undefined ? { kind: "consec", offset, suitSlot } : { kind: "consec", offset };

// ────────────────────────────────────────────────────────────────────────────
// CARD_2026: all 55 hands in server string-code format
// ────────────────────────────────────────────────────────────────────────────

const CARD_2026: Pattern[] = [
  // ── 2026 Section ──────────────────────────────────────────────────────────
  {
    id: "2026-year-1",
    description: "222 000 2222 6666 — Any 3 Suits",
    points: 25, concealed: false,
    // 3+3+4+4=14
    groups: [pung(any("2",0)), pung(exact("DWh")), kong(any("2",1)), kong(any("6",2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-year-2a",
    description: "2026 DDD 2222 DDD — Any 2 Suits, Matching Dragon, Kong 2",
    points: 25, concealed: false,
    // 1+1+1+1+3+4+3=14
    groups: [single(any("2",0)), single(exact("DWh")), single(any("2",0)), single(any("6",1)), pung(matchingDragon(0)), kong(any("2",0)), pung(matchingDragon(1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-year-2b",
    description: "2026 DDD 6666 DDD — Any 2 Suits, Matching Dragon, Kong 6",
    points: 25, concealed: false,
    // 1+1+1+1+3+4+3=14
    groups: [single(any("2",0)), single(exact("DWh")), single(any("2",0)), single(any("6",1)), pung(matchingDragon(0)), kong(any("6",1)), pung(matchingDragon(1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-year-3",
    description: "FFF 2026 222 6666 — Any 3 Suits",
    points: 25, concealed: false,
    // 3+1+1+1+1+3+4=14
    groups: [pung(flower()), single(any("2",0)), single(exact("DWh")), single(any("2",0)), single(any("6",1)), pung(any("2",2)), kong(any("6",1))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-year-4",
    description: "22 00 222 666 NEWS — Any 2 Suits",
    points: 30, concealed: false,
    // 2+2+3+3+1+1+1+1=14
    groups: [pair(any("2",0)), pair(exact("DWh")), pung(any("2",0)), pung(any("6",1)), single(exact("WN")), single(exact("WE")), single(exact("WW")), single(exact("WS"))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  // ── 2468 Section ─────────────────────────────────────────────────────────
  {
    id: "2026-2468-1",
    description: "222 444 6666 8888 — Any 1 or 2 Suits",
    points: 25, concealed: false,
    // 3+3+4+4=14
    groups: [pung(any("2",0)), pung(any("4",0)), kong(any("6",1)), kong(any("8",1))],
    suitMode: { type: "upToN", n: 2 },
  },
  {
    id: "2026-2468-2",
    description: "FF 2222 44 66 8888 — Any 2 Suits",
    points: 30, concealed: false,
    // 2+4+2+2+4=14
    groups: [pair(flower()), kong(any("2",0)), pair(any("4",1)), pair(any("6",1)), kong(any("8",1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-2468-3",
    description: "EE 22 444 666 88 WW — Any 1 Suit, East & West Only",
    points: 30, concealed: false,
    // 2+2+3+3+2+2=14
    groups: [pair(exact("WE")), pair(any("2")), pung(any("4")), pung(any("6")), pair(any("8")), pair(exact("WW"))],
  },
  {
    id: "2026-2468-4",
    description: "2222 DDD 8888 DDD — Any 2 Suits, Matching Dragons",
    points: 25, concealed: false,
    // 4+3+4+3=14
    groups: [kong(any("2",0)), pung(matchingDragon(0)), kong(any("8",1)), pung(matchingDragon(1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-2468-5",
    description: "FFF 22 44 666 8888 — Any 1 Suit",
    points: 25, concealed: false,
    // 3+2+2+3+4=14
    groups: [pung(flower()), pair(any("2")), pair(any("4")), pung(any("6")), kong(any("8"))],
  },
  {
    id: "2026-2468-6",
    description: "2468 2222 D 2222 D — Any 3 Suits, Like Kongs 2/4/6/8 w Matching Dragon",
    points: 25, concealed: false,
    // 1+1+1+1+4+1+4+1=14
    groups: [single(any("2",2)), single(any("4",2)), single(any("6",2)), single(any("8",2)), kong(anyOf(["2","4","6","8"],0,"kv")), single(matchingDragon(0)), kong(anyOf(["2","4","6","8"],1,"kv")), single(matchingDragon(1))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-2468-7",
    description: "FFF 2468 FFF 2222 — Any 2 Suits, Kong 2/4/6/8",
    points: 30, concealed: false,
    // 3+1+1+1+1+3+4=14
    groups: [pung(flower()), single(any("2",0)), single(any("4",0)), single(any("6",0)), single(any("8",0)), pung(flower()), kong(anyOf(["2","4","6","8"],1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-2468-8",
    description: "FF 246 888 246 888 — Any 2 Suits (Concealed)",
    points: 30, concealed: true,
    // 2+1+1+1+3+1+1+1+3=14
    groups: [pair(flower()), single(any("2",0)), single(any("4",0)), single(any("6",0)), pung(any("8",0)), single(any("2",1)), single(any("4",1)), single(any("6",1)), pung(any("8",1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  // ── Any Like Numbers ─────────────────────────────────────────────────────
  {
    id: "2026-aln-1",
    description: "1111 FFFFFF 1111 — Any 2 Suits, Any Like No.",
    points: 30, concealed: false,
    // 4+6+4=14
    groups: [kong(any("1",0)), sextet(flower()), kong(any("1",1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-aln-2",
    description: "1111 D 111 D 1111 D — Any 3 Suits, Matching Dragon",
    points: 25, concealed: false,
    // 4+1+3+1+4+1=14
    groups: [kong(any("1",0)), single(matchingDragon(0)), pung(any("1",1)), single(matchingDragon(1)), kong(any("1",2)), single(matchingDragon(2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-aln-3",
    description: "FF 1111 11 1111 DD — Any 3 Suits, Any Dragon",
    points: 25, concealed: false,
    // 2+4+2+4+2=14
    groups: [pair(flower()), kong(any("1",0)), pair(any("1",1)), kong(any("1",2)), pair(anyDragon())],
    suitMode: { type: "exactlyN", n: 3 },
  },
  // ── Quints ───────────────────────────────────────────────────────────────
  {
    id: "2026-quints-1",
    description: "11111 1111 11111 — Any 3 Suits, Any Like Nos.",
    points: 40, concealed: false,
    // 5+4+5=14
    groups: [quint(any("1",0)), kong(any("1",1)), quint(any("1",2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-quints-2",
    description: "FF 11111 22 33333 — Any 1 Suit, Any 3 Consec. Nos.",
    points: 45, concealed: false,
    // 2+5+2+5=14
    groups: [pair(flower()), quint(consec(0)), pair(consec(1)), quint(consec(2))],
    consecutive: { length: 3 },
  },
  {
    id: "2026-quints-3",
    description: "11111 44444 DDDD — Any 2 Nos. in Any 1 Suit, Opp. Dragon",
    points: 40, concealed: false,
    // 5+5+4=14  SIMPLIFY: oppDragon=anyDragon; any 2 different numbers
    groups: [quint(anyOf(["1","2","3","4","5","6","7","8","9"],0,"qa")), quint(anyOf(["1","2","3","4","5","6","7","8","9"],0,"qb")), kong(anyDragon())],
    suitMode: { type: "any" },
  },
  // ── Consecutive Run ───────────────────────────────────────────────────────
  {
    id: "2026-cr-1",
    description: "11 222 33 444 5555 — Any 1 Suit, Nos 1-2-3-4-5",
    points: 25, concealed: false,
    // 2+3+2+3+4=14
    groups: [pair(any("1")), pung(any("2")), pair(any("3")), pung(any("4")), kong(any("5"))],
  },
  {
    id: "2026-cr-2",
    description: "FFF 1111 234 5555 — Any 1 or 2 Suits, Any 5 Consec. Nos.",
    points: 25, concealed: false,
    // 3+4+1+1+1+4=14
    groups: [pung(flower()), kong(consec(0,0)), single(consec(1,1)), single(consec(2,1)), single(consec(3,1)), kong(consec(4,0))],
    consecutive: { length: 5 },
    suitMode: { type: "upToN", n: 2 },
  },
  {
    id: "2026-cr-3",
    description: "11 22 111 222 3333 — Any 3 Suits, Any 3 Consec. Nos.",
    points: 25, concealed: false,
    // 2+2+3+3+4=14
    groups: [pair(consec(0,0)), pair(consec(1,1)), pung(consec(0,2)), pung(consec(1,2)), kong(consec(2,2))],
    consecutive: { length: 3 },
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-cr-4",
    description: "111 222 3333 4444 — Any 1 or 2 Suits, Any 4 Consec. Nos.",
    points: 25, concealed: false,
    // 3+3+4+4=14
    groups: [pung(consec(0,0)), pung(consec(1,0)), kong(consec(2,1)), kong(consec(3,1))],
    consecutive: { length: 4 },
    suitMode: { type: "upToN", n: 2 },
  },
  {
    id: "2026-cr-5",
    description: "FFF 11 22 333 DDDD — 1 or 2 Suits, Run, Matching Dragon Middle",
    points: 25, concealed: false,
    // 3+2+2+3+4=14  SIMPLIFY: anyDragon (permissive)
    groups: [pung(flower()), pair(consec(0,0)), pair(consec(1,0)), pung(consec(2,0)), kong(anyDragon())],
    consecutive: { length: 3 },
    suitMode: { type: "upToN", n: 2 },
  },
  {
    id: "2026-cr-6",
    description: "1111 FFFFFF 2222 — Any 1 Suit, Any 2 Consec. Nos.",
    points: 30, concealed: false,
    // 4+6+4=14
    groups: [kong(consec(0)), sextet(flower()), kong(consec(1))],
    consecutive: { length: 2 },
  },
  {
    id: "2026-cr-7",
    description: "FF 1111 2222 3333 — Any 1 or 3 Suits, 3 Consec. Nos.",
    points: 25, concealed: false,
    // 2+4+4+4=14  SIMPLIFY: upToN=3
    groups: [pair(flower()), kong(consec(0,0)), kong(consec(1,1)), kong(consec(2,2))],
    consecutive: { length: 3 },
    suitMode: { type: "upToN", n: 3 },
  },
  {
    id: "2026-cr-8",
    description: "1 22 333 1 22 333 44 — Any 3 Suits, Any 4 Consec. Nos. (Concealed)",
    points: 35, concealed: true,
    // 1+2+3+1+2+3+2=14
    groups: [single(consec(0,0)), pair(consec(1,0)), pung(consec(2,0)), single(consec(0,1)), pair(consec(1,1)), pung(consec(2,1)), pair(consec(3,2))],
    consecutive: { length: 4 },
    suitMode: { type: "exactlyN", n: 3 },
  },
  // ── 13579 ─────────────────────────────────────────────────────────────────
  {
    id: "2026-13579-1",
    description: "11 333 55 777 9999 — Any 1 or 3 Suits",
    points: 25, concealed: false,
    // 2+3+2+3+4=14  SIMPLIFY: upToN=3
    groups: [pair(any("1",0)), pung(any("3",1)), pair(any("5",2)), pung(any("7",1)), kong(any("9",0))],
    suitMode: { type: "upToN", n: 3 },
  },
  {
    id: "2026-13579-2",
    description: "111 333 3333 5555 — Any 2 Suits",
    points: 30, concealed: false,
    // 3+3+4+4=14
    groups: [pung(any("1",0)), pung(any("3",0)), kong(any("3",1)), kong(any("5",1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-13579-3",
    description: "NN 1111 33 5555 SS — Any 1 Suit, North & South Only",
    points: 30, concealed: false,
    // 2+4+2+4+2=14
    groups: [pair(exact("WN")), kong(any("1")), pair(any("3")), kong(any("5")), pair(exact("WS"))],
  },
  {
    id: "2026-13579-4",
    description: "113579 1111 1111 — Any 3 Suits, Pair Odd, Kongs Match Pair",
    points: 25, concealed: false,
    // 2+1+1+1+1+4+4=14
    groups: [pair(anyOf(["1","3","5","7","9"],0,"odd")), single(any("3",1)), single(any("5",1)), single(any("7",2)), single(any("9",2)), kong(anyOf(["1","3","5","7","9"],1,"odd")), kong(anyOf(["1","3","5","7","9"],2,"odd"))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-13579-5",
    description: "FFF 11 33 555 DDDD — Any 1 Suit, Matching Dragon",
    points: 25, concealed: false,
    // 3+2+2+3+4=14
    groups: [pung(flower()), pair(any("1",0)), pair(any("3",0)), pung(any("5",0)), kong(matchingDragon(0))],
    suitMode: { type: "any" },
  },
  {
    id: "2026-13579-6",
    description: "11 33 111 333 5555 — Any 3 Suits",
    points: 25, concealed: false,
    // 2+2+3+3+4=14
    groups: [pair(any("1",0)), pair(any("3",1)), pung(any("1",2)), pung(any("3",2)), kong(any("5",2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-13579-7",
    description: "1111 33 55 77 9999 — Any 1 or 2 Suits",
    points: 25, concealed: false,
    // 4+2+2+2+4=14
    groups: [kong(any("1",0)), pair(any("3",1)), pair(any("5",1)), pair(any("7",1)), kong(any("9",0))],
    suitMode: { type: "upToN", n: 2 },
  },
  {
    id: "2026-13579-8",
    description: "FF 11 33 55 111 111 — Any 3 Suits, Nos 1-3-5 (Concealed)",
    points: 35, concealed: true,
    // 2+2+2+2+3+3=14
    groups: [pair(flower()), pair(any("1",0)), pair(any("3",1)), pair(any("5",2)), pung(any("1",1)), pung(any("1",2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-13579-9",
    description: "FF 135 777 999 DDD — Any 1 Suit, Opp. Dragon (Concealed)",
    points: 30, concealed: true,
    // 2+1+1+1+3+3+3=14  SIMPLIFY: oppDragon=anyDragon
    groups: [pair(flower()), single(any("1")), single(any("3")), single(any("5")), pung(any("7")), pung(any("9")), pung(anyDragon())],
  },
  // ── Winds and Dragons ────────────────────────────────────────────────────
  {
    id: "2026-wd-1",
    description: "NNNN EEE WWW SSSS — All winds",
    points: 25, concealed: false,
    // 4+3+3+4=14
    groups: [kong(exact("WN")), pung(exact("WE")), pung(exact("WW")), kong(exact("WS"))],
  },
  {
    id: "2026-wd-2",
    description: "1234 DDD DDD DDDD — Any 4 Consec. Nos. Any 1 Suit, Any 3 Dragons",
    points: 25, concealed: false,
    // 1+1+1+1+3+3+4=14  SIMPLIFY: 3 dragon groups as anyDragon
    groups: [single(consec(0)), single(consec(1)), single(consec(2)), single(consec(3)), pung(anyDragon()), pung(anyDragon()), kong(anyDragon())],
    consecutive: { length: 4 },
  },
  {
    id: "2026-wd-3",
    description: "NNN 1111 1111 SSS — Any Like Odd Nos. in Any 2 Suits",
    points: 25, concealed: false,
    // 3+4+4+3=14
    groups: [pung(exact("WN")), kong(anyOf(["1","3","5","7","9"],0,"odd")), kong(anyOf(["1","3","5","7","9"],1,"odd")), pung(exact("WS"))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-wd-4",
    description: "EEE 2222 2222 WWW — Any Like Even Nos. in Any 2 Suits",
    points: 25, concealed: false,
    // 3+4+4+3=14
    groups: [pung(exact("WE")), kong(anyOf(["2","4","6","8"],0,"even")), kong(anyOf(["2","4","6","8"],1,"even")), pung(exact("WW"))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  // W&D #5: 4 wind variants
  ...["WE","WS","WW","WN"].map((windCode): Pattern => ({
    id: `2026-wd-5-${windCode}`,
    description: `FFF ${windCode}${windCode}${windCode}${windCode} FFF DDDD — Any Wind, Any Dragon`,
    points: 25, concealed: false,
    // 3+4+3+4=14
    groups: [pung(flower()), kong(exact(windCode)), pung(flower()), kong(anyDragon())],
  })),
  {
    id: "2026-wd-6",
    description: "1 N 2 EE 3 WWW 4 SSSS — Any 1 Suit, Nos 1-2-3-4",
    points: 25, concealed: false,
    // 1+1+1+2+1+3+1+4=14
    groups: [single(any("1")), single(exact("WN")), single(any("2")), pair(exact("WE")), single(any("3")), pung(exact("WW")), single(any("4")), kong(exact("WS"))],
  },
  {
    id: "2026-wd-7",
    description: "FF NNNN SSSS DD DD — Any 2 Dragons",
    points: 25, concealed: false,
    // 2+4+4+2+2=14  SIMPLIFY: both dragon pairs = anyDragon (permissive)
    groups: [pair(flower()), kong(exact("WN")), kong(exact("WS")), pair(anyDragon()), pair(anyDragon())],
  },
  {
    id: "2026-wd-8",
    description: "NN EEE 2026 WWW SS — Any 1 Suit (Concealed)",
    points: 30, concealed: true,
    // 2+3+1+1+1+1+3+2=14
    groups: [pair(exact("WN")), pung(exact("WE")), single(any("2")), single(exact("DWh")), single(any("2")), single(any("6")), pung(exact("WW")), pair(exact("WS"))],
  },
  // ── 369 ──────────────────────────────────────────────────────────────────
  {
    id: "2026-369-1",
    description: "333 666 6666 9999 — Any 2 or 3 Suits",
    points: 25, concealed: false,
    // 3+3+4+4=14  SIMPLIFY: upToN=3
    groups: [pung(any("3",0)), pung(any("6",1)), kong(any("6",2)), kong(any("9",2))],
    suitMode: { type: "upToN", n: 3 },
  },
  {
    id: "2026-369-2",
    description: "33 66 333 666 9999 — Any 3 Suits",
    points: 25, concealed: false,
    // 2+2+3+3+4=14
    groups: [pair(any("3",0)), pair(any("6",1)), pung(any("3",2)), pung(any("6",2)), kong(any("9",2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-369-3",
    description: "FFF 33 666 99 DDDD — 1 Suit, Matching or Opp Dragon",
    points: 25, concealed: false,
    // 3+2+3+2+4=14  SIMPLIFY: anyDragon
    groups: [pung(flower()), pair(any("3")), pung(any("6")), pair(any("9")), kong(anyDragon())],
  },
  {
    id: "2026-369-4",
    description: "33 66 666 999 NEWS — Any 2 Suits",
    points: 30, concealed: false,
    // 2+2+3+3+1+1+1+1=14
    groups: [pair(any("3",0)), pair(any("6",0)), pung(any("6",1)), pung(any("9",1)), single(exact("WN")), single(exact("WE")), single(exact("WW")), single(exact("WS"))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-369-5",
    description: "FF 3369 3333 3333 — Any 3 Suits, Pair 3/6/9, Kongs Match Pair",
    points: 25, concealed: false,
    // 2+2+1+1+4+4=14  SIMPLIFY: singles = anyOf{3,6,9} permissive
    groups: [pair(flower()), pair(anyOf(["3","6","9"],0,"pv")), single(anyOf(["3","6","9"],1)), single(anyOf(["3","6","9"],1)), kong(anyOf(["3","6","9"],2,"pv")), kong(anyOf(["3","6","9"],2,"pv"))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-369-6",
    description: "FF 333 666 999 369 — Any 2 Suits (Concealed)",
    points: 30, concealed: true,
    // 2+3+3+3+1+1+1=14
    groups: [pair(flower()), pung(any("3",0)), pung(any("6",0)), pung(any("9",0)), single(any("3",1)), single(any("6",1)), single(any("9",1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  // ── Singles and Pairs ────────────────────────────────────────────────────
  {
    id: "2026-sp-1",
    description: "NN EE WW SS 1D 1D 1D — Any 3 Suits, Like No. w Matching Dragon (Concealed)",
    points: 50, concealed: true,
    // 2+2+2+2+1+1+1+1+1+1=14
    groups: [pair(exact("WN")), pair(exact("WE")), pair(exact("WW")), pair(exact("WS")), single(anyOf(["1","2","3","4","5","6","7","8","9"],0)), single(matchingDragon(0)), single(anyOf(["1","2","3","4","5","6","7","8","9"],1)), single(matchingDragon(1)), single(anyOf(["1","2","3","4","5","6","7","8","9"],2)), single(matchingDragon(2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-sp-2",
    description: "2 4 66 88 2 4 66 88 88 — Any 3 Suits, Nos 2-4-6-8 (Concealed)",
    points: 50, concealed: true,
    // 1+1+2+2+1+1+2+2+2=14
    groups: [single(any("2",0)), single(any("4",0)), pair(any("6",0)), pair(any("8",0)), single(any("2",1)), single(any("4",1)), pair(any("6",1)), pair(any("8",1)), pair(any("8",2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-sp-3",
    description: "FF 3369 3669 3699 — Any 3 Suits (Concealed)",
    points: 50, concealed: true,
    // 2+1+1+1+1+1+1+1+1+1+1+1+1=14
    groups: [pair(flower()), single(any("3",0)), single(any("3",0)), single(any("6",0)), single(any("9",0)), single(any("3",1)), single(any("6",1)), single(any("6",1)), single(any("9",1)), single(any("3",2)), single(any("6",2)), single(any("9",2)), single(any("9",2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
  {
    id: "2026-sp-4",
    description: "11 22 33 44 55 66 77 — Any 1 Suit, Any 7 Consec. Nos. (Concealed)",
    points: 50, concealed: true,
    // 2+2+2+2+2+2+2=14
    groups: [pair(consec(0)), pair(consec(1)), pair(consec(2)), pair(consec(3)), pair(consec(4)), pair(consec(5)), pair(consec(6))],
    consecutive: { length: 7 },
  },
  {
    id: "2026-sp-5",
    description: "11 357 99 11 357 99 — Any 2 Suits (Concealed)",
    points: 50, concealed: true,
    // 2+1+1+1+2+2+1+1+1+2=14
    groups: [pair(any("1",0)), single(any("3",0)), single(any("5",0)), single(any("7",0)), pair(any("9",0)), pair(any("1",1)), single(any("3",1)), single(any("5",1)), single(any("7",1)), pair(any("9",1))],
    suitMode: { type: "exactlyN", n: 2 },
  },
  {
    id: "2026-sp-6",
    description: "FF 2026 2026 2026 — Any 3 Suits (Concealed)",
    points: 75, concealed: true,
    // 2+1+1+1+1+1+1+1+1+1+1+1+1=14
    groups: [pair(flower()), single(any("2",0)), single(exact("DWh")), single(any("2",0)), single(any("6",0)), single(any("2",1)), single(exact("DWh")), single(any("2",1)), single(any("6",1)), single(any("2",2)), single(exact("DWh")), single(any("2",2)), single(any("6",2))],
    suitMode: { type: "exactlyN", n: 3 },
  },
];

const CARDS: Record<number, Pattern[]> = { 2026: CARD_2026 };

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

function matchesBase(code: string, m: Matcher): boolean {
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
    case "anyDragon":
      return code === "DR" || code === "DG" || code === "DWh";
    case "matchingDragon":
    case "oppositeDragon":
      // Will be resolved during assignment
      return code === "DR" || code === "DG" || code === "DWh";
    case "consec":
      return suitOf(code) !== null;
    case "anyOf": {
      const s = suitOf(code);
      return s !== null && m.values.includes(valueOf(code));
    }
  }
}

// Resolve matcher to concrete for a given suit/consec/lockValue context
function resolveMatcher(
  m: Matcher,
  suit: NumSuit | null,
  consecStart: number | null,
  lockedValues: Record<string, string>,
  allSlots: Record<number, NumSuit>,
): Matcher {
  switch (m.kind) {
    case "anySuit":
      if (suit) return { kind: "exact", code: `${suit}${m.value}` };
      return m;
    case "consec": {
      if (consecStart === null) return m;
      const val = consecStart + m.offset;
      if (suit) return { kind: "exact", code: `${suit}${val}` };
      return m;
    }
    case "anyOf": {
      let value: string | undefined;
      if (m.lockKey && lockedValues[m.lockKey] !== undefined) {
        value = lockedValues[m.lockKey];
      }
      if (value === undefined) return m;
      if (suit) return { kind: "exact", code: `${suit}${value}` };
      return { kind: "anySuit", value };
    }
    case "matchingDragon": {
      const slot = m.suitSlot ?? 0;
      const s = allSlots[slot] ?? suit;
      if (s) return { kind: "exact", code: matchingDragonCode(s) };
      return { kind: "anyDragon" };
    }
    case "oppositeDragon":
      // SIMPLIFY: accept any dragon
      return { kind: "anyDragon" };
    default:
      return m;
  }
}

function sumCounts(p: Pattern): number {
  return p.groups.reduce((n, g) => n + g.count, 0);
}

function hasExplicitSuitSlots(p: Pattern): boolean {
  return p.groups.some((g) => {
    const m = g.match as { suitSlot?: number };
    return m.suitSlot !== undefined;
  });
}

function hasLegacyAnySuit(p: Pattern): boolean {
  return p.groups.some((g) => g.match.kind === "anySuit" && (g.match as { suitSlot?: number }).suitSlot === undefined);
}

function hasConsec(p: Pattern): boolean {
  return p.groups.some((g) => g.match.kind === "consec");
}

function hasAnyOf(p: Pattern): boolean {
  return p.groups.some((g) => g.match.kind === "anyOf");
}

function collectSlots(p: Pattern): Set<number> {
  const slots = new Set<number>();
  for (const g of p.groups) {
    const m = g.match as { suitSlot?: number };
    if (m.suitSlot !== undefined) slots.add(m.suitSlot);
  }
  return slots;
}

const NUM_SUITS: NumSuit[] = ["B", "C", "D"];

function enumSuitAssignments(slots: number[], suitMode: SuitMode): Record<number, NumSuit>[] {
  const results: Record<number, NumSuit>[] = [];
  function recurse(idx: number, current: Record<number, NumSuit>) {
    if (idx === slots.length) {
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

function enumAnyOfLocks(p: Pattern): Record<string, string>[] {
  const keyValues: Record<string, string[]> = {};
  for (const g of p.groups) {
    if (g.match.kind === "anyOf" && (g.match as { lockKey?: string }).lockKey) {
      const lk = (g.match as { lockKey: string }).lockKey;
      if (!keyValues[lk]) keyValues[lk] = (g.match as { values: string[] }).values;
    }
  }
  const keys = Object.keys(keyValues);
  if (keys.length === 0) return [{}];
  const results: Record<string, string>[] = [];
  function recurse(idx: number, current: Record<string, string>) {
    if (idx === keys.length) { results.push({ ...current }); return; }
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

function tryMatch(tiles: string[], pattern: Pattern): boolean {
  if (tiles.length !== sumCounts(pattern)) return false;

  if (hasExplicitSuitSlots(pattern)) {
    const slotSet = collectSlots(pattern);
    const slots = Array.from(slotSet).sort();
    const suitMode = pattern.suitMode ?? { type: "any" };
    const suitAssignments = enumSuitAssignments(slots, suitMode);
    const consecLen = pattern.consecutive?.length ?? null;
    const consecStarts = consecLen !== null ? Array.from({ length: 9 - consecLen + 1 }, (_, i) => i + 1) : [null];
    const anyOfLocks = enumAnyOfLocks(pattern);
    for (const sa of suitAssignments) {
      for (const cs of consecStarts) {
        for (const locks of anyOfLocks) {
          if (tryMatchWithContext(tiles, pattern, sa, cs, locks)) return true;
        }
      }
    }
    return false;
  }

  if (hasLegacyAnySuit(pattern)) {
    const consecLen = pattern.consecutive?.length ?? null;
    const consecStarts = consecLen !== null ? Array.from({ length: 9 - consecLen + 1 }, (_, i) => i + 1) : [null];
    const anyOfLocks = enumAnyOfLocks(pattern);
    for (const suit of NUM_SUITS) {
      for (const cs of consecStarts) {
        for (const locks of anyOfLocks) {
          if (tryMatchWithContext(tiles, pattern, {}, cs, locks, suit)) return true;
        }
      }
    }
    return false;
  }

  if (hasConsec(pattern)) {
    const consecLen = pattern.consecutive?.length ?? 3;
    const consecStarts = Array.from({ length: 9 - consecLen + 1 }, (_, i) => i + 1);
    for (const suit of NUM_SUITS) {
      for (const cs of consecStarts) {
        if (tryMatchWithContext(tiles, pattern, {}, cs, {}, suit)) return true;
      }
    }
    return false;
  }

  if (hasAnyOf(pattern)) {
    const anyOfLocks = enumAnyOfLocks(pattern);
    for (const locks of anyOfLocks) {
      if (tryMatchWithContext(tiles, pattern, {}, null, locks)) return true;
    }
    return false;
  }

  return tryMatchWithContext(tiles, pattern, {}, null, {});
}

function tryMatchWithContext(
  tiles: string[],
  pattern: Pattern,
  suitSlots: Record<number, NumSuit>,
  consecStart: number | null,
  lockedValues: Record<string, string>,
  globalSuit?: NumSuit,
): boolean {
  const used = new Array<boolean>(tiles.length).fill(false);

  function assign(gi: number): boolean {
    if (gi >= pattern.groups.length) return used.every(Boolean);
    const g = pattern.groups[gi];
    const m = g.match;

    let groupSuit: NumSuit | null = null;
    if (m.kind === "anySuit" || m.kind === "consec" || m.kind === "anyOf") {
      const slotKey = (m as { suitSlot?: number }).suitSlot;
      if (slotKey !== undefined && suitSlots[slotKey] !== undefined) {
        groupSuit = suitSlots[slotKey];
      } else if (globalSuit) {
        groupSuit = globalSuit;
      }
    }

    const resolved = resolveMatcher(m, groupSuit, consecStart, lockedValues, suitSlots);

    // anyOf without lockKey: enumerate possible values
    if (m.kind === "anyOf" && !(m as { lockKey?: string }).lockKey) {
      for (const val of (m as { values: string[] }).values) {
        const lockedM: Matcher = groupSuit
          ? { kind: "exact", code: `${groupSuit}${val}` }
          : { kind: "anySuit", value: val };
        if (tryAssignGroup(gi, g, lockedM, assign)) return true;
      }
      return false;
    }

    return tryAssignGroup(gi, g, resolved, assign);
  }

  function tryAssignGroup(gi: number, g: Group, m: Matcher, cont: (gi: number) => boolean): boolean {
    const real: number[] = [];
    const jokers: number[] = [];
    for (let i = 0; i < tiles.length; i++) {
      if (used[i]) continue;
      if (isJoker(tiles[i])) jokers.push(i);
      else if (matchesBase(tiles[i], m)) real.push(i);
    }
    const realPick = Math.min(real.length, g.count);
    const jokersNeeded = g.count - realPick;
    if (jokersNeeded > 0 && !g.jokersAllowed) return false;
    if (jokersNeeded > jokers.length) return false;
    const picked = real.slice(0, realPick).concat(jokers.slice(0, jokersNeeded));
    picked.forEach((i) => (used[i] = true));
    if (cont(gi + 1)) return true;
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
