import { Price } from './price.vo';

describe('Price', () => {
  describe('fromUsd', () => {
    it('parses integer price', () => {
      expect(Price.fromUsd('50000').toString()).toBe('50000.00000000');
    });

    it('parses 8 decimal places', () => {
      expect(Price.fromUsd('50000.12345678').toString()).toBe('50000.12345678');
    });

    it('parses fewer than 8 decimal places', () => {
      expect(Price.fromUsd('50000.5').toString()).toBe('50000.50000000');
    });

    it('throws on more than 8 decimal places', () => {
      expect(() => Price.fromUsd('1.000000001')).toThrow(RangeError);
    });

    it('throws on negative value', () => {
      expect(() => Price.fromUsd('-1')).toThrow(RangeError);
    });
  });

  describe('comparisons', () => {
    const low = Price.fromUsd('100');
    const mid = Price.fromUsd('200');
    const high = Price.fromUsd('300');

    it('gt: higher > lower', () => {
      expect(high.gt(mid)).toBe(true);
    });

    it('gt: not when equal', () => {
      expect(mid.gt(mid)).toBe(false);
    });

    it('lt: lower < higher', () => {
      expect(low.lt(mid)).toBe(true);
    });

    it('lt: not when equal', () => {
      expect(mid.lt(mid)).toBe(false);
    });

    it('eq: equal prices', () => {
      expect(Price.fromUsd('100').eq(Price.fromUsd('100'))).toBe(true);
    });

    it('eq: different prices', () => {
      expect(low.eq(high)).toBe(false);
    });
  });

  describe('toNumber', () => {
    it('converts to number', () => {
      expect(Price.fromUsd('50000.5').toNumber()).toBeCloseTo(50000.5);
    });
  });
});
