import { analyzeHand, closestPattern, suggestDiscards } from '@/src/logic/handAnalyzer';
import type { Tile } from '@/src/games/nmjl';
import { CURRENT_CARD_YEAR } from '@/src/games/nmjl/currentCard';
import '@/src/games/nmjl'; // side-effect: registers the current (2026) card

const t = (id: string, suit: Tile['suit'], value: string): Tile => ({ id, suit, value });

// 13 tiles built from odd-number Bam groups (1/3/5/7/9) that line up closely
// with the current card's 13579 family, plus one clearly-useless wind tile.
// The analyzer is a fuzzy "closest pattern" estimator, so we assert behaviour
// (near-complete progress, useless tile is the safest discard) rather than a
// specific pattern id, which can tie across several same-shape hands.
const nearWin: Tile[] = [
  t('1', 'bam', '1'), t('2', 'bam', '1'), t('3', 'bam', '1'), t('3b', 'bam', '1'),
  t('4', 'bam', '3'), t('5', 'bam', '3'),
  t('7', 'bam', '5'), t('8', 'bam', '5'),
  t('10', 'bam', '7'), t('11', 'bam', '7'),
  t('a', 'bam', '9'), t('b', 'bam', '9'), t('c', 'bam', '9'),
  t('14', 'wind', 'E'),
];

describe('handAnalyzer', () => {
  it('ranks patterns and finds the closest one', () => {
    const ranked = analyzeHand(nearWin, CURRENT_CARD_YEAR);
    expect(ranked.length).toBeGreaterThan(0);
    const best = closestPattern(nearWin, CURRENT_CARD_YEAR);
    expect(best).not.toBeNull();
    // This hand is one tile away from a full 14-tile hand on the current card.
    expect(best!.pattern.year).toBe(CURRENT_CARD_YEAR);
    expect(best!.percent).toBeGreaterThanOrEqual(0.9);
  });

  it('suggests discarding the tile that builds no top hand first', () => {
    const suggestions = suggestDiscards(nearWin, CURRENT_CARD_YEAR);
    expect(suggestions.length).toBeGreaterThan(0);
    // Tile '14' (lone wind) contributes to none of the top hands, so it should
    // be ranked the safest to discard.
    expect(suggestions[0].tileId).toBe('14');
  });

  it('never suggests discarding a joker or flower', () => {
    const withSpecials: Tile[] = [
      ...nearWin.slice(0, 13),
      t('j', 'joker', 'J'),
      t('f', 'flower', 'F'),
    ];
    const ids = suggestDiscards(withSpecials, CURRENT_CARD_YEAR).map((s) => s.tileId);
    expect(ids).not.toContain('j');
    expect(ids).not.toContain('f');
  });

  it('returns no patterns for an unregistered year', () => {
    expect(analyzeHand(nearWin, 1999)).toHaveLength(0);
    expect(closestPattern(nearWin, 1999)).toBeNull();
  });
});
