import { InsufficientBalanceError } from '../errors/insufficient-balance.error';
import { Money } from './money.vo';

describe('Money', () => {
  describe('fromPred', () => {
    it('parses integer string', () => {
      expect(Money.fromPred('100').toString()).toBe('100.0000');
    });

    it('parses decimal string with 4 places', () => {
      expect(Money.fromPred('100.1234').toString()).toBe('100.1234');
    });

    it('parses decimal string with fewer than 4 places', () => {
      expect(Money.fromPred('100.5').toString()).toBe('100.5000');
    });

    it('parses zero', () => {
      expect(Money.fromPred('0').toString()).toBe('0.0000');
    });

    it('parses number', () => {
      expect(Money.fromPred(50).toString()).toBe('50.0000');
    });

    it('throws on more than 4 decimal places', () => {
      expect(() => Money.fromPred('1.00001')).toThrow(RangeError);
    });

    it('throws on negative value', () => {
      expect(() => Money.fromPred('-1')).toThrow(RangeError);
    });

    it('throws on invalid string', () => {
      expect(() => Money.fromPred('abc')).toThrow(RangeError);
    });
  });

  describe('zero', () => {
    it('returns 0.0000', () => {
      expect(Money.zero().toString()).toBe('0.0000');
    });
  });

  describe('add', () => {
    it('adds two amounts', () => {
      const a = Money.fromPred('100');
      const b = Money.fromPred('50.5');
      expect(a.add(b).toString()).toBe('150.5000');
    });

    it('adds zero', () => {
      const a = Money.fromPred('100');
      expect(a.add(Money.zero()).toString()).toBe('100.0000');
    });
  });

  describe('sub', () => {
    it('subtracts smaller from larger', () => {
      const a = Money.fromPred('100');
      const b = Money.fromPred('30');
      expect(a.sub(b).toString()).toBe('70.0000');
    });

    it('subtracts equal amounts to zero', () => {
      const a = Money.fromPred('100');
      expect(a.sub(a).toString()).toBe('0.0000');
    });

    it('throws InsufficientBalanceError when result would be negative', () => {
      const a = Money.fromPred('50');
      const b = Money.fromPred('100');
      expect(() => a.sub(b)).toThrow(InsufficientBalanceError);
    });
  });

  describe('mul', () => {
    it('multiplies by integer', () => {
      expect(Money.fromPred('100').mul(3).toString()).toBe('300.0000');
    });

    it('multiplies by fraction', () => {
      expect(Money.fromPred('100').mul(0.5).toString()).toBe('50.0000');
    });

    it('multiplies by compound factor', () => {
      // x5 multiplier: (5-1) * (1 - 0.30) = 2.8
      const result = Money.fromPred('100').mul(2.8);
      expect(result.toNumber()).toBeCloseTo(280, 2);
    });

    it('multiplies by zero', () => {
      expect(Money.fromPred('100').mul(0).toString()).toBe('0.0000');
    });
  });

  describe('neg', () => {
    it('returns negated value', () => {
      const a = Money.fromPred('100');
      expect(a.neg().toString()).toBe('-100.0000');
    });

    it('double negation returns original', () => {
      const a = Money.fromPred('100');
      expect(a.neg().neg().toString()).toBe('100.0000');
    });
  });

  describe('comparisons', () => {
    it('gte: equal amounts', () => {
      expect(Money.fromPred('100').gte(Money.fromPred('100'))).toBe(true);
    });

    it('gte: larger >= smaller', () => {
      expect(Money.fromPred('100').gte(Money.fromPred('50'))).toBe(true);
    });

    it('gte: smaller is not >= larger', () => {
      expect(Money.fromPred('50').gte(Money.fromPred('100'))).toBe(false);
    });

    it('gt: strictly greater', () => {
      expect(Money.fromPred('100').gt(Money.fromPred('99'))).toBe(true);
    });

    it('gt: equal is not strictly greater', () => {
      expect(Money.fromPred('100').gt(Money.fromPred('100'))).toBe(false);
    });

    it('eq: equal amounts', () => {
      expect(Money.fromPred('100').eq(Money.fromPred('100'))).toBe(true);
    });

    it('eq: different amounts', () => {
      expect(Money.fromPred('100').eq(Money.fromPred('101'))).toBe(false);
    });
  });

  describe('toNumber', () => {
    it('converts to number', () => {
      expect(Money.fromPred('100.5').toNumber()).toBe(100.5);
    });
  });
});
