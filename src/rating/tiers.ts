// SRS Tiers — 8 tiers from Beginner to Grand Master.
// Cutoffs are centralized tunable constants. See srs_spec.md "Tiers".

export interface Tier {
  name: string;
  min: number; // inclusive lower bound (display + selection)
  max: number; // inclusive upper bound for display (Infinity for the top tier)
}

export type TierName =
  | 'Beginner'
  | 'Novice'
  | 'Apprentice'
  | 'Skilled'
  | 'Expert'
  | 'Master'
  | 'Elite'
  | 'Grand Master';

// Lower bounds (ascending). Tune these to re-shape the ladder.
//
// Re-centered for a learning-focused audience. Everyone starts at R1500, so the
// start rating sits early in the SECOND tier (Novice) rather than mid-ladder:
// beginners can drop into Beginner, and have six tiers above to climb. The low
// tiers are deliberately narrow (100 wide) so the first few wins visibly bump
// the player up a tier (early progress feels rewarding); tiers then widen toward
// the top (125 → 150 → 175 → 200) so the upper ranks stay aspirational but each
// is still reachable with sustained play.
export const TIER_MINS: { name: TierName; min: number }[] = [
  { name: 'Beginner', min: -Infinity }, // floor — below the start rating
  { name: 'Novice', min: 1450 }, // start R1500 lands here (tier 2 of 8)
  { name: 'Apprentice', min: 1550 }, // +100
  { name: 'Skilled', min: 1650 }, // +100
  { name: 'Expert', min: 1775 }, // +125
  { name: 'Master', min: 1925 }, // +150
  { name: 'Elite', min: 2100 }, // +175
  { name: 'Grand Master', min: 2300 }, // +200
];

// Precomputed tiers with inclusive [min, max] display ranges.
export const TIERS: Tier[] = TIER_MINS.map((t, i) => ({
  name: t.name,
  min: t.min,
  max: i + 1 < TIER_MINS.length ? TIER_MINS[i + 1].min - 1 : Infinity,
}));

/** Map a rating to its tier (the highest tier whose min <= rating). */
export function tierForRating(rating: number): Tier {
  let chosen = TIERS[0];
  for (const t of TIERS) {
    if (rating >= t.min) chosen = t;
    else break;
  }
  return chosen;
}
