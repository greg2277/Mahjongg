// SRS table update — ties Layers 2 & 3 together for one 4-player table treated
// as a single Glicko-2 rating period (3 pairwise matches per player).

import { computeNGS } from './ngs';
import {
  type Glicko2State,
  type Glicko2Match,
  updatePlayer,
  DEFAULT_TAU,
} from './glicko2';

export const PROVISIONAL_RD = 150; // a player is provisional until RD < this

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/**
 * Pairwise outcome for player i vs opponent j derived from NGS:
 *   s_ij = clamp(0.5 + (NGS_i - NGS_j)/2, 0, 1)
 * Equal NGS => 0.5; maximum gap => 1 / 0. NGS is already in [0,1].
 */
export function pairwiseScore(ngsI: number, ngsJ: number): number {
  return clamp(0.5 + (ngsI - ngsJ) / 2, 0, 1);
}

/**
 * Table Strength Multiplier, applied to the rating DELTA only (not RD/sigma).
 * Uses the players' RD entering the period:
 *   x1.15 when ALL four RD < 100 ; x0.85 when ANY RD > 200 ; x1.00 otherwise.
 */
export function tableStrengthMultiplier(rds: number[]): number {
  if (rds.every((rd) => rd < 100)) return 1.15;
  if (rds.some((rd) => rd > 200)) return 0.85;
  return 1.0;
}

export interface SeatUpdate {
  before: Glicko2State;
  after: Glicko2State;
  ngs: number;
  delta: number; // scaled rating change actually applied
  provisional: boolean;
}

/**
 * Run the rating update for a whole table. `states` and `totals` are aligned by
 * seat. Returns one SeatUpdate per seat. The Table Strength Multiplier scales
 * each seat's raw Glicko-2 rating delta; RD and sigma come straight from Glicko-2.
 */
export function updateTable(
  states: Glicko2State[],
  totals: number[],
  tau: number = DEFAULT_TAU,
): SeatUpdate[] {
  const n = states.length;
  const ngs = computeNGS(totals);
  const multiplier = tableStrengthMultiplier(states.map((s) => s.rd));

  return states.map((before, i) => {
    const matches: Glicko2Match[] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      matches.push({
        opponentRating: states[j].rating,
        opponentRd: states[j].rd,
        score: pairwiseScore(ngs[i], ngs[j]),
      });
    }
    const raw = updatePlayer(before, matches, tau);
    const scaledDelta = (raw.rating - before.rating) * multiplier;
    const newRating = Math.round((before.rating + scaledDelta) * 100) / 100;
    const after: Glicko2State = {
      rating: newRating,
      rd: Math.round(raw.rd * 100) / 100,
      sigma: raw.sigma,
    };
    return {
      before,
      after,
      ngs: ngs[i],
      delta: Math.round(scaledDelta * 100) / 100,
      provisional: after.rd >= PROVISIONAL_RD,
    };
  });
}
