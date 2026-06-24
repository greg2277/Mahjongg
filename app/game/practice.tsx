import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import PrimaryButton from '@/src/components/PrimaryButton';
import { Tile, type TileSuit } from '@/src/components/Tile';
import { useStatsSync } from '@/src/hooks/useStatsSync';
import { validateHand, getYearCard, isJoker, type Tile as RuleTile } from '@/src/games/nmjl';
import { CURRENT_CARD_YEAR } from '@/src/games/nmjl/currentCard';
import { OnboardingTour, type TourStep } from '@/src/components/OnboardingTour';
import { HandAnalysisMeter } from '@/src/components/HandAnalysisMeter';
import { TileSortControls } from '@/src/components/TileSortControls';
import { sortTiles, type SortMode } from '@/src/games/nmjl/sort';

const PRACTICE_TOUR: TourStep[] = [
  {
    icon: 'hand-left',
    title: 'Take Your Turn',
    body: 'When it is your turn, draw a tile then tap a tile in your hand to select it and discard. The AI opponents play automatically right after you.',
    tone: 'jade',
  },
  {
    icon: 'bulb',
    title: 'Coach Hints',
    body: 'Stuck? Tap Hint to get a target hand from the NMJL card to build toward — a great way to apply what you learned.',
    tone: 'gold',
  },
  {
    icon: 'trophy',
    title: 'Declare Mahjong',
    body: 'When your 14 tiles match a legal card line, the Declare Mahjong button lights up. It is validated by the same rule engine used in multiplayer.',
    tone: 'rose',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// AI OPPONENT PRACTICE
//
// A full single-player simulated game vs. 3 AI opponents. Runs entirely on
// device (no network) so students can apply training before multiplayer.
// Uses the SAME NMJL rule engine (validateHand / getYearCard) that powers
// real games, so a win here is a legal win there.
// ─────────────────────────────────────────────────────────────────────────

const SEATS = ['You', 'Mei (AI)', 'Lin (AI)', 'Hana (AI)'] as const;
const WINDS = ['E', 'S', 'W', 'N'] as const;

type GamePhase = 'charleston' | 'awaiting-draw' | 'awaiting-discard' | 'ai-turn' | 'finished';

// Charleston: 3 mandatory passes (Left, Across, Right) + 1 optional Courtesy.
// receiver seat = (giver + offset) % 4
// NMJL order: Right, Across, Left (then optional courtesy across).
const CHARLESTON_LABELS = ['RIGHT', 'ACROSS', 'LEFT', 'COURTESY (optional)'] as const;
const CHARLESTON_OFFSET = [3, 2, 1, 2] as const;

let tileCounter = 0;
function makeTile(suit: TileSuit, value: string): RuleTile {
  return { id: `t${tileCounter++}`, suit, value };
}

// Build a full American Mahjong wall as RuleTile objects.
function buildWall(): RuleTile[] {
  const tiles: RuleTile[] = [];
  const numSuits: TileSuit[] = ['bam', 'crak', 'dot'];
  for (const s of numSuits) {
    for (let n = 1; n <= 9; n++) for (let r = 0; r < 4; r++) tiles.push(makeTile(s, String(n)));
  }
  for (const w of ['E', 'S', 'W', 'N']) for (let r = 0; r < 4; r++) tiles.push(makeTile('wind', w));
  for (const d of ['R', 'G', 'Wh']) for (let r = 0; r < 4; r++) tiles.push(makeTile('dragon', d));
  for (let i = 0; i < 8; i++) tiles.push(makeTile('flower', 'F'));
  for (let i = 0; i < 8; i++) tiles.push(makeTile('joker', 'J'));
  // Fisher-Yates shuffle
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

// Hands are kept in draw order internally; sorting is applied for display
// via the user's chosen SortMode. AI hands use a stable suit sort.
function sortHand(hand: RuleTile[]): RuleTile[] {
  return sortTiles(hand, 'suit');
}

// Score a tile's "usefulness" for an AI hand — keep tiles that pair up,
// keep jokers & flowers; discard lonely honors / singletons first.
function tileUtility(hand: RuleTile[], t: RuleTile): number {
  if (isJoker(t)) return 100;
  if (t.suit === 'flower') return 40;
  const sameCount = hand.filter((h) => h.suit === t.suit && h.value === t.value).length;
  if (sameCount >= 3) return 60;
  if (sameCount === 2) return 45;
  // number tiles with neighbors (consecutive) are mildly useful
  if (t.suit === 'bam' || t.suit === 'crak' || t.suit === 'dot') {
    const n = parseInt(t.value, 10);
    const hasNeighbor = hand.some(
      (h) => h.suit === t.suit && Math.abs(parseInt(h.value, 10) - n) === 1,
    );
    return hasNeighbor ? 20 : 8;
  }
  // lone winds/dragons
  return 5;
}

// Draw from the live wall; if a flower is drawn, keep it in hand and pull a
// replacement tile from the dead-wall end (NMJL flower replacement rule).
function drawWithFlowerReplacement(wall: RuleTile[], hand: RuleTile[]): RuleTile | null {
  if (wall.length === 0) return null;
  let drawn = wall.shift()!;
  while (drawn.suit === 'flower') {
    hand.push(drawn); // flower stays in the hand
    if (wall.length === 0) return null;
    drawn = wall.pop()!; // replacement comes off the dead-wall end
  }
  return drawn;
}

// AI selects its 3 least useful tiles to give away during a Charleston pass.
function aiChoosePass(hand: RuleTile[]): RuleTile[] {
  return [...hand]
    .sort((a, b) => tileUtility(hand, a) - tileUtility(hand, b))
    .slice(0, 3);
}

// AI picks the least useful tile to discard.
function aiChooseDiscard(hand: RuleTile[]): RuleTile {
  let worst = hand[0];
  let worstScore = Infinity;
  for (const t of hand) {
    const u = tileUtility(hand, t);
    if (u < worstScore) {
      worstScore = u;
      worst = t;
    }
  }
  return worst;
}

type PracticeState = {
  wall: RuleTile[];
  hands: RuleTile[][]; // 4 hands
  exposed: RuleTile[][];
  discards: { tile: RuleTile; seat: number }[];
  turnSeat: number;
  phase: GamePhase;
  winnerSeat: number | null;
  winInfo: { points: number; description: string } | null;
  charlestonStep: number; // 0=Left, 1=Across, 2=Right, 3=Courtesy
  charlestonPending: RuleTile[]; // tiles the player selected to pass
  charlestonDone: boolean;
};

function deal(): PracticeState {
  const wall = buildWall();
  const hands: RuleTile[][] = [[], [], [], []];
  for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) hands[s].push(wall.shift()!);
  // No 14th tile yet — Charleston happens before the first draw.
  for (let s = 0; s < 4; s++) hands[s] = sortHand(hands[s]);
  return {
    wall,
    hands,
    exposed: [[], [], [], []],
    discards: [],
    turnSeat: 0,
    phase: 'charleston',
    winnerSeat: null,
    winInfo: null,
    charlestonStep: 0,
    charlestonPending: [],
    charlestonDone: false,
  };
}

export default function PracticeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { recordGame } = useStatsSync();

  const [state, setState] = useState<PracticeState>(() => deal());
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('suit');
  const [log, setLog] = useState<string[]>(['Game started. Charleston — pass 3 tiles to your LEFT.']);
  const [hintPattern, setHintPattern] = useState<string | null>(null);
  const recordedRef = useRef(false);

  const card = useMemo(() => getYearCard(CURRENT_CARD_YEAR), []);

  const pushLog = useCallback((msg: string) => {
    setLog((l) => [msg, ...l].slice(0, 8));
  }, []);

  const myHand = state.hands[0];
  const sortedMyHand = useMemo(() => sortTiles(myHand, sortMode), [myHand, sortMode]);

  // Check whether current player's 14 tiles form a legal win.
  const canDeclareMahjong = useMemo(() => {
    if (state.phase !== 'awaiting-discard') return false;
    if (myHand.length !== 14) return false;
    return validateHand(myHand, CURRENT_CARD_YEAR).valid;
  }, [myHand, state.phase]);

  // ── PLAYER ACTIONS ──────────────────────────────────────────────────

  const drawForPlayer = useCallback(() => {
    setState((s) => {
      if (s.phase !== 'awaiting-draw' || s.turnSeat !== 0) return s;
      if (s.wall.length === 0) {
        pushLog('Wall is empty — the game is a wash.');
        return { ...s, phase: 'finished' };
      }
      const wall = [...s.wall];
      const hands = s.hands.map((h) => [...h]);
      const drawn = drawWithFlowerReplacement(wall, hands[0]);
      if (!drawn) {
        pushLog('Wall is empty — the game is a wash.');
        return { ...s, wall, hands, phase: 'finished' };
      }
      hands[0].push(drawn);
      hands[0] = sortHand(hands[0]);
      pushLog(`You drew a tile (${labelTile(drawn)}).`);
      return { ...s, wall, hands, phase: 'awaiting-discard' };
    });
  }, [pushLog]);

  const discardSelected = useCallback(() => {
    if (!selectedTileId) return;
    setState((s) => {
      if (s.phase !== 'awaiting-discard' || s.turnSeat !== 0) return s;
      const hands = s.hands.map((h) => [...h]);
      const idx = hands[0].findIndex((t) => t.id === selectedTileId);
      if (idx === -1) return s;
      const [tile] = hands[0].splice(idx, 1);
      const discards = [{ tile, seat: 0 }, ...s.discards];
      pushLog(`You discarded ${labelTile(tile)}.`);
      return { ...s, hands, discards, turnSeat: 1, phase: 'ai-turn' };
    });
    setSelectedTileId(null);
  }, [selectedTileId, pushLog]);

  // ── CHARLESTON ──────────────────────────────────────────────────────

  const toggleCharlestonTile = useCallback((t: RuleTile) => {
    if (state.phase !== 'charleston') return;
    setState((s) => {
      const exists = s.charlestonPending.find((p) => p.id === t.id);
      let pending: RuleTile[];
      if (exists) pending = s.charlestonPending.filter((p) => p.id !== t.id);
      else {
        if (s.charlestonPending.length >= 3) return s;
        pending = [...s.charlestonPending, t];
      }
      return { ...s, charlestonPending: pending };
    });
  }, [state.phase]);

  // Resolve one Charleston round: every seat passes 3 tiles to the seat at
  // CHARLESTON_OFFSET[step]. Advances the step; after step 3 (or courtesy
  // skip) deals East's 14th tile and begins normal play.
  const runCharlestonRound = useCallback((skipped: boolean) => {
    setState((s) => {
      if (s.phase !== 'charleston') return s;
      const step = s.charlestonStep;
      const hands = s.hands.map((h) => [...h]);

      if (!skipped) {
        const offset = CHARLESTON_OFFSET[step];
        // Each seat chooses 3 tiles to give.
        const giving: RuleTile[][] = [];
        for (let seat = 0; seat < 4; seat++) {
          if (seat === 0) giving[seat] = s.charlestonPending;
          else giving[seat] = aiChoosePass(hands[seat]);
        }
        // Remove given tiles from each hand.
        for (let seat = 0; seat < 4; seat++) {
          const ids = new Set(giving[seat].map((t) => t.id));
          hands[seat] = hands[seat].filter((t) => !ids.has(t.id));
        }
        // Deliver: seat -> (seat + offset) % 4.
        for (let seat = 0; seat < 4; seat++) {
          const receiver = (seat + offset) % 4;
          hands[receiver].push(...giving[seat]);
        }
        for (let seat = 0; seat < 4; seat++) hands[seat] = sortHand(hands[seat]);
        pushLog(`Charleston: passed 3 tiles ${CHARLESTON_LABELS[step].split(' ')[0]}.`);
      } else {
        pushLog('Charleston: courtesy pass skipped.');
      }

      // After mandatory steps 0-2 we continue; step 2 -> courtesy (step 3).
      if (!skipped && step < 3) {
        const nextStep = step + 1;
        if (nextStep <= 2) {
          pushLog(`Charleston — pass 3 tiles ${CHARLESTON_LABELS[nextStep]}.`);
          return { ...s, hands, charlestonStep: nextStep, charlestonPending: [] };
        }
        // nextStep === 3 → offer courtesy
        pushLog('Charleston — optional courtesy pass. Pass 3 or skip.');
        return { ...s, hands, charlestonStep: 3, charlestonPending: [] };
      }

      // Charleston complete (courtesy done or skipped) → deal East's 14th tile.
      const wall = [...s.wall];
      const drawn = drawWithFlowerReplacement(wall, hands[0]);
      if (drawn) {
        hands[0].push(drawn);
        hands[0] = sortHand(hands[0]);
      }
      pushLog('Charleston complete. You are East — discard a tile to begin.');
      return {
        ...s,
        wall,
        hands,
        charlestonStep: 3,
        charlestonPending: [],
        charlestonDone: true,
        turnSeat: 0,
        phase: 'awaiting-discard',
      };
    });
    setSelectedTileId(null);
  }, [pushLog]);

  const declareMahjong = useCallback(() => {
    const result = validateHand(myHand, CURRENT_CARD_YEAR);
    if (!result.valid) {
      pushLog('That hand does not match a line on the card yet.');
      return;
    }
    setState((s) => ({
      ...s,
      phase: 'finished',
      winnerSeat: 0,
      winInfo: { points: result.points ?? 25, description: result.pattern?.description ?? 'NMJL hand' },
    }));
    pushLog(`Mahjong! ${result.pattern?.description ?? ''} (+${result.points ?? 25} pts)`);
  }, [myHand, pushLog]);

  const showHint = useCallback(() => {
    const target = card[Math.floor(Math.random() * card.length)];
    if (!target) return;
    setHintPattern(target.description);
    pushLog(`Coach: try building toward "${target.description}".`);
  }, [card, pushLog]);

  const newGame = useCallback(() => {
    recordedRef.current = false;
    setState(deal());
    setSelectedTileId(null);
    setHintPattern(null);
    setLog(['New game started. Charleston — pass 3 tiles to your LEFT.']);
  }, []);

  // ── AI TURN LOOP ────────────────────────────────────────────────────

  useEffect(() => {
    if (state.phase !== 'ai-turn') return;
    const timer = setTimeout(() => {
      setState((s) => {
        if (s.phase !== 'ai-turn') return s;
        const seat = s.turnSeat;
        const wall = [...s.wall];
        const hands = s.hands.map((h) => [...h]);
        const exposed = s.exposed.map((e) => [...e]);
        let discards = [...s.discards];

        if (wall.length === 0) {
          pushLog('Wall is empty — the game is a wash.');
          return { ...s, phase: 'finished' };
        }

        // AI draws with NMJL flower replacement
        const drawn = drawWithFlowerReplacement(wall, hands[seat]);
        if (!drawn) {
          pushLog('Wall is empty — the game is a wash.');
          return { ...s, wall, hands, phase: 'finished' };
        }
        hands[seat].push(drawn);

        // AI win check
        const aiResult = hands[seat].length === 14 ? validateHand(hands[seat], CURRENT_CARD_YEAR) : { valid: false } as ReturnType<typeof validateHand>;
        if (aiResult.valid) {
          const result = aiResult;
          pushLog(`${SEATS[seat]} declared Mahjong!`);
          return {
            ...s,
            wall,
            hands,
            phase: 'finished',
            winnerSeat: seat,
            winInfo: { points: result.points ?? 25, description: result.pattern?.description ?? 'NMJL hand' },
          };
        }

        // AI discards least useful tile
        const toDiscard = aiChooseDiscard(hands[seat]);
        const idx = hands[seat].findIndex((t) => t.id === toDiscard.id);
        hands[seat].splice(idx, 1);
        hands[seat] = sortHand(hands[seat]);
        discards = [{ tile: toDiscard, seat }, ...discards];
        pushLog(`${SEATS[seat]} discarded ${labelTile(toDiscard)}.`);

        const nextSeat = (seat + 1) % 4;
        if (nextSeat === 0) {
          return { ...s, wall, hands, exposed, discards, turnSeat: 0, phase: 'awaiting-draw' };
        }
        return { ...s, wall, hands, exposed, discards, turnSeat: nextSeat, phase: 'ai-turn' };
      });
    }, 850);
    return () => clearTimeout(timer);
  }, [state.phase, state.turnSeat, pushLog]);

  // Record stats once when finished
  useEffect(() => {
    if (state.phase === 'finished' && !recordedRef.current) {
      recordedRef.current = true;
      const won = state.winnerSeat === 0;
      const points = state.winInfo?.points ?? 0;
      recordGame(won, points, 0, undefined).catch(() => undefined);
    }
  }, [state.phase, state.winnerSeat, state.winInfo, recordGame]);

  const isMyTurn = state.turnSeat === 0 && (state.phase === 'awaiting-draw' || state.phase === 'awaiting-discard');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <OnboardingTour tourId="practice" steps={PRACTICE_TOUR} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <LinearGradient
          colors={theme.gradientHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 26 }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Back</Text>
          </Pressable>

          <Badge label="Practice" tone="gold" />
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '800', marginTop: 10, letterSpacing: -0.5 }}>
            AI Opponent Practice
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, lineHeight: 19 }}>
            A full simulated game vs. three AI players. Same NMJL rules as multiplayer — no pressure, no ranking.
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
            {SEATS.map((name, i) => (
              <View
                key={name}
                style={{
                  flex: 1,
                  backgroundColor: state.turnSeat === i ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: 8,
                  borderWidth: state.turnSeat === i ? 1.5 : 0,
                  borderColor: '#FFF',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700' }}>
                  {WINDS[i]}
                </Text>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 2 }}>
                  {state.hands[i].length} tiles
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, marginTop: -12, gap: 12 }}>
          {state.phase === 'charleston' ? (
            <CharlestonCard
              step={state.charlestonStep}
              hand={sortedMyHand}
              pending={state.charlestonPending}
              onToggle={toggleCharlestonTile}
              onPass={() => runCharlestonRound(false)}
              onSkip={() => runCharlestonRound(true)}
            />
          ) : state.phase === 'finished' ? (
            <ResultCard
              won={state.winnerSeat === 0}
              winnerName={state.winnerSeat != null ? SEATS[state.winnerSeat] : null}
              info={state.winInfo}
              onReplay={newGame}
              onExit={() => router.back()}
            />
          ) : (
            <>
              {/* Discard pile */}
              <Card variant="elevated" padding={14}>
                <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
                  DISCARD PILE · WALL {state.wall.length}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10, minHeight: 50 }}>
                  {state.discards.slice(0, 14).map((d, i) => (
                    <Tile key={d.tile.id} suit={d.tile.suit} value={d.tile.value} size="xs" faded={i > 0} />
                  ))}
                  {state.discards.length === 0 ? (
                    <Text style={{ color: theme.textSubtle, fontSize: 13, paddingVertical: 14 }}>
                      No discards yet.
                    </Text>
                  ) : null}
                </View>
              </Card>

              {/* My hand */}
              <Card variant="elevated" padding={14}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>Your hand</Text>
                    <View
                      style={{
                        backgroundColor: myHand.length === 14 ? theme.gold + '22' : theme.border,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ color: myHand.length === 14 ? theme.goldDark : theme.textSubtle, fontSize: 11, fontWeight: '800' }}>
                        {myHand.length} tiles · {myHand.length === 14 ? 'discard one' : 'waiting'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={showHint}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    hitSlop={8}
                  >
                    <Ionicons name="bulb-outline" size={16} color={theme.gold} />
                    <Text style={{ color: theme.gold, fontSize: 13, fontWeight: '700' }}>Hint</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                  <TileSortControls mode={sortMode} onChange={setSortMode} compact />
                </View>

                {hintPattern ? (
                  <View
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: theme.gold + '1A',
                      borderLeftWidth: 3,
                      borderLeftColor: theme.gold,
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 12, lineHeight: 17 }}>
                      Target line: {hintPattern}
                    </Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 12, justifyContent: 'center' }}>
                  {sortedMyHand.map((t) => (
                    <Pressable
                      key={t.id}
                      disabled={state.phase !== 'awaiting-discard'}
                      onPress={() => setSelectedTileId((cur) => (cur === t.id ? null : t.id))}
                    >
                      <Tile suit={t.suit} value={t.value} size="sm" selected={selectedTileId === t.id} />
                    </Pressable>
                  ))}
                </View>

                <View style={{ marginTop: 16, gap: 10 }}>
                  {state.phase === 'awaiting-draw' && isMyTurn ? (
                    <PrimaryButton label="Draw a tile" size="lg" onPress={drawForPlayer} />
                  ) : null}

                  {state.phase === 'awaiting-discard' ? (
                    <>
                      {canDeclareMahjong ? (
                        <Pressable
                          onPress={declareMahjong}
                          style={{
                            paddingVertical: 16,
                            borderRadius: 12,
                            backgroundColor: theme.gold,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: '#3B2A05', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>
                            ★ DECLARE MAHJONG ★
                          </Text>
                        </Pressable>
                      ) : null}
                      <PrimaryButton
                        label={selectedTileId ? 'Discard selected tile' : 'Select a tile to discard'}
                        size="lg"
                        onPress={discardSelected}
                        disabled={!selectedTileId}
                      />
                    </>
                  ) : null}

                  {state.phase === 'ai-turn' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 }}>
                      <Ionicons name="hourglass-outline" size={16} color={theme.textSubtle} />
                      <Text style={{ color: theme.textSubtle, fontSize: 14, fontWeight: '600' }}>
                        {SEATS[state.turnSeat]} is thinking…
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Card>

              {/* Hand analysis */}
              <Card variant="elevated" padding={14}>
                <HandAnalysisMeter hand={myHand} year={CURRENT_CARD_YEAR} />
              </Card>

              {/* Activity log */}
              <Card variant="default" padding={14}>
                <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>
                  TABLE LOG
                </Text>
                {log.map((line, i) => (
                  <Text
                    key={i}
                    style={{
                      color: i === 0 ? theme.text : theme.textSubtle,
                      fontSize: 12,
                      lineHeight: 18,
                      fontWeight: i === 0 ? '700' : '400',
                    }}
                  >
                    {line}
                  </Text>
                ))}
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function labelTile(t: RuleTile): string {
  if (t.suit === 'joker') return 'Joker';
  if (t.suit === 'flower') return 'Flower';
  if (t.suit === 'wind') return `${t.value} Wind`;
  if (t.suit === 'dragon') {
    const name = t.value === 'R' ? 'Red' : t.value === 'G' ? 'Green' : 'White';
    return `${name} Dragon`;
  }
  const suitName = t.suit === 'bam' ? 'Bam' : t.suit === 'crak' ? 'Crak' : 'Dot';
  return `${t.value} ${suitName}`;
}

function CharlestonCard({
  step,
  hand,
  pending,
  onToggle,
  onPass,
  onSkip,
}: {
  step: number;
  hand: RuleTile[];
  pending: RuleTile[];
  onToggle: (t: RuleTile) => void;
  onPass: () => void;
  onSkip: () => void;
}) {
  const { theme } = useTheme();
  const isCourtesy = step === 3;
  const dir = CHARLESTON_LABELS[step];
  const canPass = pending.length === 3;
  return (
    <Card variant="elevated" padding={16}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="swap-horizontal" size={18} color={theme.gold} />
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900', letterSpacing: 0.3 }}>
          CHARLESTON — Pass {dir}
        </Text>
      </View>
      <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
        {isCourtesy
          ? 'Optional courtesy pass. Tap 3 tiles to pass across, or skip.'
          : 'Tap 3 tiles to pass. You will receive 3 tiles in return.'}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < step ? theme.gold : i === step ? theme.gold + '88' : theme.border,
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 14, justifyContent: 'center' }}>
        {hand.map((t) => {
          const sel = !!pending.find((p) => p.id === t.id);
          return (
            <Pressable key={t.id} onPress={() => onToggle(t)}>
              <Tile suit={t.suit} value={t.value} size="sm" selected={sel} />
            </Pressable>
          );
        })}
      </View>

      <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 12, textAlign: 'center' }}>
        {pending.length} / 3 selected
      </Text>

      <View style={{ marginTop: 14, gap: 10 }}>
        <PrimaryButton
          label={canPass ? 'Pass tiles' : `Select ${3 - pending.length} more`}
          size="lg"
          onPress={onPass}
          disabled={!canPass}
        />
        {isCourtesy ? (
          <Pressable
            onPress={onSkip}
            style={{
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Skip courtesy pass</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

function ResultCard({
  won,
  winnerName,
  info,
  onReplay,
  onExit,
}: {
  won: boolean;
  winnerName: string | null;
  info: { points: number; description: string } | null;
  onReplay: () => void;
  onExit: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Card variant="elevated" padding={20}>
      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: (won ? theme.gold : theme.textSubtle) + '22',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Ionicons name={won ? 'trophy' : 'flag'} size={36} color={won ? theme.gold : theme.textSubtle} />
        </View>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>
          {won ? 'You won!' : winnerName ? `${winnerName} won` : 'Wall game'}
        </Text>
        {info ? (
          <Text style={{ color: theme.textSubtle, fontSize: 14, marginTop: 6, textAlign: 'center' }}>
            {info.description} · {info.points} pts
          </Text>
        ) : (
          <Text style={{ color: theme.textSubtle, fontSize: 14, marginTop: 6 }}>
            The wall ran out — no winner this round.
          </Text>
        )}
        <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 4 }}>
          {won ? '+60 XP earned' : '+15 XP for practicing'}
        </Text>
        <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
          <PrimaryButton label="Play again" size="lg" onPress={onReplay} />
          <Pressable
            onPress={onExit}
            style={{
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Back to Play</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}
