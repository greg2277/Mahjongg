// SRS Layer 1 — Hand Scoring (Laura's NMJL rules).
// Two parallel structures:
//   - Tournament / League POINTS  -> the RATING INPUT (consumed by NGS + Glicko-2).
//   - Cash / Home-game PAYMENTS    -> money settlement only (NOT the rating input).
// See srs_spec.md "Layer 1 — Hand Scoring".

/** A single hand outcome at the table, expressed for the POINTS structure. */
export type HandEvent =
  | {
      type: 'win';
      winner: number; // seat index of the winner
      handValue: number; // card value of the winning hand
      selfPick: boolean; // winner drew the winning tile themselves
      jokerless: boolean; // hand contained no jokers
      singlesAndPairs?: boolean; // S&P hands get NO jokerless premium
      // Present only for a discard win:
      discarder?: number; // seat index of the player who threw the winning tile
      exposuresOnWinnerRack?: number; // 0..3 exposures on the winner's rack
    }
  | { type: 'wall' } // wall game: no winner
  | { type: 'falseMahjong'; declarer: number }; // false declaration

export const SELF_PICK_BONUS = 10;
export const JOKERLESS_BONUS = 20;
export const WALL_GAME_POINTS = 10;
export const FALSE_MAHJONG_PENALTY = -25;

/**
 * Tournament/league POINTS the winner receives for a winning hand:
 *   handValue (+10 self-pick) (+20 jokerless, NOT for Singles & Pairs).
 */
export function winnerPoints(input: {
  handValue: number;
  selfPick: boolean;
  jokerless: boolean;
  singlesAndPairs?: boolean;
}): number {
  let pts = input.handValue;
  if (input.selfPick) pts += SELF_PICK_BONUS;
  if (input.jokerless && !input.singlesAndPairs) pts += JOKERLESS_BONUS;
  return pts;
}

/**
 * Discard penalty applied to the discarder only, by exposures on the winner's rack:
 *   0-1 exposures -> -10 ; 2-3 exposures -> -25.
 */
export function discardPenalty(exposuresOnWinnerRack: number): number {
  return exposuresOnWinnerRack <= 1 ? -10 : -25;
}

/**
 * Per-seat POINTS deltas for a single hand event (rating input structure).
 * Returns an array of length `numPlayers` (default 4).
 */
export function scoreHand(event: HandEvent, numPlayers = 4): number[] {
  const deltas = new Array<number>(numPlayers).fill(0);
  switch (event.type) {
    case 'win': {
      deltas[event.winner] += winnerPoints(event);
      if (event.discarder !== undefined) {
        deltas[event.discarder] += discardPenalty(event.exposuresOnWinnerRack ?? 0);
      }
      break;
    }
    case 'wall': {
      for (let i = 0; i < numPlayers; i++) deltas[i] += WALL_GAME_POINTS;
      break;
    }
    case 'falseMahjong': {
      deltas[event.declarer] += FALSE_MAHJONG_PENALTY;
      break;
    }
  }
  return deltas;
}

/** Cumulative per-seat session totals across a list of hand events. */
export function sessionTotals(events: HandEvent[], numPlayers = 4): number[] {
  const totals = new Array<number>(numPlayers).fill(0);
  for (const ev of events) {
    const d = scoreHand(ev, numPlayers);
    for (let i = 0; i < numPlayers; i++) totals[i] += d[i];
  }
  return totals;
}

// ─────────── Cash / Home-game PAYMENTS (money settlement; NOT rating input) ───────────

export type CashWin = {
  winner: number;
  cardValue: number;
  selfPick: boolean;
  jokerless: boolean;
  singlesAndPairs?: boolean; // S&P: no jokerless premium
  discarder?: number; // present for a discard win
  numPlayers?: number; // default 4
};

/**
 * Per-seat cash deltas for a single winning hand. Losers are negative, the
 * winner positive (= sum of what the losers pay).
 *
 * Rules (srs_spec.md "Cash / Home Game Payments"):
 *  - Base: each non-winner pays the card value.
 *  - Self-pick: all three losers pay double.
 *  - Self-pick + jokerless: all three pay double-double (4x).
 *  - Discard win, hand has jokers: thrower pays double; others pay base.
 *  - Discard win, jokerless: thrower pays double-double; others pay double.
 *  - Singles & Pairs: jokerless premium does not apply.
 */
export function cashPayments(win: CashWin): number[] {
  const n = win.numPlayers ?? 4;
  const base = win.cardValue;
  const jokerless = win.jokerless && !win.singlesAndPairs;
  const deltas = new Array<number>(n).fill(0);

  for (let seat = 0; seat < n; seat++) {
    if (seat === win.winner) continue;
    let mult: number;
    if (win.selfPick) {
      mult = jokerless ? 4 : 2;
    } else if (seat === win.discarder) {
      mult = jokerless ? 4 : 2;
    } else {
      mult = jokerless ? 2 : 1;
    }
    deltas[seat] = -base * mult;
  }
  deltas[win.winner] = -deltas.reduce((a, b) => a + b, 0);
  return deltas;
}

/**
 * Bettor rule: a bettor mirrors the player they bet on. Given the table's
 * per-seat deltas and the seat the bettor backed, the bettor receives the same
 * delta as that seat. Returns the amount the bettor wins/loses.
 */
export function bettorMirror(deltas: number[], betOnSeat: number): number {
  return deltas[betOnSeat] ?? 0;
}
