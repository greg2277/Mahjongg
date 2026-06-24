import { analyzeHand, closestPattern, suggestDiscards } from '@/src/logic/handAnalyzer';
import type { Tile } from '@/src/games/nmjl';
import '@/src/games/nmjl'; // side-effect: registers the 2025 card

const t = (id: string, suit: Tile['suit'], value: string): Tile => ({ id, suit, value });

// 13 tiles toward the 13579 bam line plus one clearly-useless wind tile.
const nearWin: Tile[] = [
  t('1', 'bam', '1'), t('2', 'bam', '1'), t('3', 'bam', '1'),
  t('4', 'bam', '3'), t('5', 'bam', '3'), t('6', 'bam', '3'),
  t('7', 'bam', '5'), t('8', 'bam', '5'), t('9', 'bam', '5'),
  t('10', 'bam', '7'), t('11', 'bam', '7'), t('12', 'bam', '7'),
  t('13', 'bam', '9'),
  t('14', 'wind', 'E'),
];

describe('handAnalyzer', () => {
  it('ranks patterns and finds the closest one', () => {
    const ranked = analyzeHand(nearWin, 2025);
    expect(ranked.length).toBeGreaterThan(0);
    const best = closestPattern(nearWin, 2025);
    expect(best).not.toBeNull();
    expect(best!.pattern.id).toBe('2025-13579');
    expect(best!.percent).toBeGreaterThanOrEqual(0.9);
  });

  it('suggests discarding the tile that builds no top hand first', () => {
    const suggestions = suggestDiscards(nearWin, 2025);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].tileId).toBe('14');
  });

  it('never suggests discarding a joker or flower', () => {
    const withSpecials: Tile[] = [
      ...nearWin.slice(0, 13),
      t('j', 'joker', 'J'),
      t('f', 'flower', 'F'),
    ];
    const ids = suggestDiscards(withSpecials, 2025).map((s) => s.tileId);
    expect(ids).not.toContain('j');
    expect(ids).not.toContain('f');
  });

  it('returns no patterns for an unregistered year', () => {
    expect(analyzeHand(nearWin, 1999)).toHaveLength(0);
    expect(closestPattern(nearWin, 1999)).toBeNull();
  });
});
