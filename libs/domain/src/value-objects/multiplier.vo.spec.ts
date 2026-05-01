import { InvalidMultiplierError } from '../errors/invalid-multiplier.error';
import { Multiplier } from './multiplier.vo';

describe('Multiplier', () => {
  it('creates valid multipliers 2-10', () => {
    for (const v of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const m = Multiplier.of(v);
      expect(m.value).toBe(v);
      expect(m.liquidationPercent).toBeGreaterThan(0);
    }
  });

  it('returns correct liquidationPercent for x2', () => {
    expect(Multiplier.of(2).liquidationPercent).toBe(10);
  });

  it('returns correct liquidationPercent for x5', () => {
    expect(Multiplier.of(5).liquidationPercent).toBe(30);
  });

  it('returns correct liquidationPercent for x10', () => {
    expect(Multiplier.of(10).liquidationPercent).toBe(59);
  });

  it('throws InvalidMultiplierError for 0', () => {
    expect(() => Multiplier.of(0)).toThrow(InvalidMultiplierError);
  });

  it('throws InvalidMultiplierError for 1', () => {
    expect(() => Multiplier.of(1)).toThrow(InvalidMultiplierError);
  });

  it('throws InvalidMultiplierError for 11', () => {
    expect(() => Multiplier.of(11)).toThrow(InvalidMultiplierError);
  });
});
