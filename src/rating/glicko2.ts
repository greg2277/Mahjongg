// SRS Layer 3 — Self-contained Glicko-2 implementation (Mark Glickman).
// Standard algorithm: convert R/RD to the internal mu/phi scale, compute the
// estimated variance v and improvement delta over the rating period's matches,
// solve for the new volatility sigma via the iterative (Illinois) algorithm with
// system constant tau, then derive the new phi and mu and convert back to R/RD.
// Defaults: R=1500, RD=350, sigma=0.06, tau=0.5. See srs_spec.md "Layer 3".

export interface Glicko2State {
  rating: number; // R
  rd: number; // RD (rating deviation)
  sigma: number; // volatility
}

export interface Glicko2Match {
  opponentRating: number;
  opponentRd: number;
  score: number; // outcome in [0,1]
}

export const DEFAULT_RATING = 1500;
export const DEFAULT_RD = 350;
export const DEFAULT_SIGMA = 0.06;
export const DEFAULT_TAU = 0.5;

// Glicko-2 scale factor between the public (R/RD) and internal (mu/phi) scales.
const SCALE = 173.7178;
const CONVERGENCE = 1e-6;

const g = (phi: number): number => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));

const expectedScore = (mu: number, muJ: number, phiJ: number): number =>
  1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

export function defaultState(): Glicko2State {
  return { rating: DEFAULT_RATING, rd: DEFAULT_RD, sigma: DEFAULT_SIGMA };
}

/**
 * Run a single Glicko-2 rating period for one player against a set of matches.
 * Returns the updated R/RD/sigma. With no matches, only RD inflates (per the
 * standard "did not compete" step).
 */
export function updatePlayer(
  state: Glicko2State,
  matches: Glicko2Match[],
  tau: number = DEFAULT_TAU,
): Glicko2State {
  const mu = (state.rating - DEFAULT_RATING) / SCALE;
  const phi = state.rd / SCALE;
  const sigma = state.sigma;

  // Step: a player who did not compete — RD increases, R/sigma unchanged.
  if (matches.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return { rating: state.rating, rd: phiStar * SCALE, sigma };
  }

  // Estimated variance v and improvement-sum (delta = v * sum).
  let vInv = 0;
  let deltaSum = 0;
  for (const m of matches) {
    const muJ = (m.opponentRating - DEFAULT_RATING) / SCALE;
    const phiJ = m.opponentRd / SCALE;
    const gJ = g(phiJ);
    const eJ = expectedScore(mu, muJ, phiJ);
    vInv += gJ * gJ * eJ * (1 - eJ);
    deltaSum += gJ * (m.score - eJ);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  // Iteratively solve for the new volatility sigma' (Illinois algorithm).
  const a = Math.log(sigma * sigma);
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (tau * tau);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }

  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > CONVERGENCE) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }
  const newSigma = Math.exp(A / 2);

  // Pre-rating-period RD, then new phi and mu.
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * deltaSum;

  return {
    rating: newMu * SCALE + DEFAULT_RATING,
    rd: newPhi * SCALE,
    sigma: newSigma,
  };
}
