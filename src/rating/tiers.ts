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
export const TIER_MINS: { name: TierName; min: number }[] = [
  { name: 'Beginner', min: -Infinity },
  { name: 'Novice', min: 1300 },
  { name: 'Apprentice', min: 1450 },
  { name: 'Skilled', min: 1600 },
  { name: 'Expert', min: 1750 },
  { name: 'Master', min: 1900 },
  { name: 'Elite', min: 2050 },
  { name: 'Grand Master', min: 2200 },
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
