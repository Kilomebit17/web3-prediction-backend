import { ScoreCalculator } from './score-calculator';

describe('ScoreCalculator', () => {
  const calc = new ScoreCalculator();

  it('returns positive delta for win at x2', () => {
    expect(calc.delta(2, 'won')).toBe(20n);
  });

  it('returns negative delta for loss at x2', () => {
    expect(calc.delta(2, 'lost')).toBe(-2n);
  });

  it('returns correct win delta for x10', () => {
    expect(calc.delta(10, 'won')).toBe(100n);
  });

  it('returns correct loss delta for x10', () => {
    expect(calc.delta(10, 'lost')).toBe(-59n);
  });

  it.each([
    [2, 20, 2],
    [3, 30, 5],
    [5, 50, 20],
    [7, 70, 30],
    [10, 100, 59],
  ])('multiplier %i: win=%i lose=%i', (mult, win, lose) => {
    expect(calc.delta(mult, 'won')).toBe(BigInt(win));
    expect(calc.delta(mult, 'lost')).toBe(-BigInt(lose));
  });

  it('throws for unknown multiplier', () => {
    expect(() => calc.delta(1, 'won')).toThrow(RangeError);
  });
});
