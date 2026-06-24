import {
  validateWinningHand,
  validateExposure,
  getCard,
  isJoker,
  isFlower,
  CURRENT_CARD_YEAR,
} from '@/convex/nmjlValidation';

describe('nmjlValidation tile helpers', () => {
  it('identifies jokers and flowers', () => {
    expect(isJoker('J')).toBe(true);
    expect(isJoker('B1')).toBe(false);
    expect(isFlower('F1')).toBe(true);
    expect(isFlower('D5')).toBe(false);
  });
});

describe('validateExposure', () => {
  it('accepts a legal pung', () => {
    expect(validateExposure('B2-B2-B2').ok).toBe(true);
  });

  it('accepts a pung completed with a joker', () => {
    expect(validateExposure('B2-B2-J').ok).toBe(true);
  });

  it('rejects groups smaller than a pung', () => {
    expect(validateExposure('B2-B2').ok).toBe(false);
  });

  it('rejects mixed tiles', () => {
    expect(validateExposure('B2-B3-B4').ok).toBe(false);
  });

  it('rejects an all-joker exposure', () => {
    expect(validateExposure('J-J-J').ok).toBe(false);
  });
});

describe('validateWinningHand', () => {
  // 2026 card, 13579 line "2026-13579-3": NN 1111 33 5555 SS — Any 1 Suit,
  // North & South Only. Single suit (Bam): 2+4+2+4+2 = 14 tiles.
  const win13579 = [
    'WN', 'WN',
    'B1', 'B1', 'B1', 'B1',
    'B3', 'B3',
    'B5', 'B5', 'B5', 'B5',
    'WS', 'WS',
  ];

  it('accepts a valid single-suit 13579 hand on the current card', () => {
    const res = validateWinningHand(win13579, [], CURRENT_CARD_YEAR);
    expect(res.valid).toBe(true);
    expect(res.patternId).toBe('2026-13579-3');
    expect(res.points).toBe(30);
  });

  it('allows a joker to substitute inside a kong', () => {
    // Replace one tile of the 1111 kong (kongs allow jokers; the WN/WS pairs do not).
    const withJoker = ['WN', 'WN', 'J', 'B1', 'B1', 'B1', 'B3', 'B3', 'B5', 'B5', 'B5', 'B5', 'WS', 'WS'];
    const res = validateWinningHand(withJoker, [], CURRENT_CARD_YEAR);
    expect(res.valid).toBe(true);
    expect(res.patternId).toBe('2026-13579-3');
  });

  it('rejects a hand that is not 14 tiles', () => {
    const res = validateWinningHand(win13579.slice(0, 13), [], CURRENT_CARD_YEAR);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/14/);
  });

  it('rejects when no card exists for the year', () => {
    expect(getCard(1999)).toHaveLength(0);
    const res = validateWinningHand(win13579, [], 1999);
    expect(res.valid).toBe(false);
  });

  it('rejects tiles that match no pattern', () => {
    const junk = [
      'B1', 'C2', 'D3', 'B4', 'C5', 'D6', 'B7', 'C8',
      'D9', 'WE', 'WS', 'WW', 'WN', 'DR',
    ];
    const res = validateWinningHand(junk, [], CURRENT_CARD_YEAR);
    expect(res.valid).toBe(false);
  });
});
