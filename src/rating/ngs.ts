// SRS Layer 2 — Normalized Game Score (NGS) in [0,1].
//   NGS = (YourPoints - LowestAtTable) / (HighestAtTable - LowestAtTable)
// Preserves margin of victory. If Highest == Lowest (all tie / divide-by-zero),
// every player gets NGS = 0.5. See srs_spec.md "Layer 2".

export function computeNGS(totals: number[]): number[] {
  if (totals.length === 0) return [];
  const highest = Math.max(...totals);
  const lowest = Math.min(...totals);
  if (highest === lowest) return totals.map(() => 0.5);
  const range = highest - lowest;
  return totals.map((t) => (t - lowest) / range);
}
