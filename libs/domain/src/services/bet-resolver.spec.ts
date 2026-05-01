import { Bet } from '../entities/bet.entity';
import { Money } from '../value-objects/money.vo';
import { Multiplier } from '../value-objects/multiplier.vo';
import { Price } from '../value-objects/price.vo';
import { BetResolver } from './bet-resolver';

function makeBet(direction: 'up' | 'down', multiplierValue = 2): Bet {
  return Bet.create({
    userId: 'user-1',
    coinId: 'bitcoin',
    direction,
    amount: Money.fromPred('100'),
    multiplier: Multiplier.of(multiplierValue),
    durationSeconds: 300,
    entryPrice: Price.fromUsd('50000'),
  });
}

describe('BetResolver', () => {
  const resolver = new BetResolver();

  describe('UP direction', () => {
    it('returns won when endPrice > entryPrice', () => {
      const bet = makeBet('up');
      const result = resolver.resolve(bet, Price.fromUsd('51000'));
      expect(result.status).toBe('won');
    });

    it('returns lost when endPrice < entryPrice', () => {
      const bet = makeBet('up');
      const result = resolver.resolve(bet, Price.fromUsd('49000'));
      expect(result.status).toBe('lost');
    });

    it('returns cancelled when endPrice === entryPrice', () => {
      const bet = makeBet('up');
      const result = resolver.resolve(bet, Price.fromUsd('50000'));
      expect(result.status).toBe('cancelled');
    });
  });

  describe('DOWN direction', () => {
    it('returns won when endPrice < entryPrice', () => {
      const bet = makeBet('down');
      const result = resolver.resolve(bet, Price.fromUsd('49000'));
      expect(result.status).toBe('won');
    });

    it('returns lost when endPrice > entryPrice', () => {
      const bet = makeBet('down');
      const result = resolver.resolve(bet, Price.fromUsd('51000'));
      expect(result.status).toBe('lost');
    });
  });

  describe('netWinAmount formula (ROADMAP §6.4)', () => {
    it('won: netWin = amount + amount*(mult-1)*(1 - liq/100) for x2 (liq=10%)', () => {
      // amount=100, mult=2, liq=10%: netWin = 100 + 100*1*0.9 = 100+90 = 190
      const bet = makeBet('up', 2);
      const result = resolver.resolve(bet, Price.fromUsd('51000'));
      expect(result.status).toBe('won');
      expect(result.netWinAmount.toNumber()).toBeCloseTo(190);
    });

    it('won: netWin for x5 (liq=30%)', () => {
      // amount=100, mult=5, liq=30%: netWin = 100 + 100*4*0.7 = 100+280 = 380
      const bet = makeBet('up', 5);
      const result = resolver.resolve(bet, Price.fromUsd('51000'));
      expect(result.netWinAmount.toNumber()).toBeCloseTo(380);
    });

    it('won: netWin for x10 (liq=59%)', () => {
      // amount=100, mult=10, liq=59%: netWin = 100 + 100*9*0.41 = 100+369 = 469
      const bet = makeBet('up', 10);
      const result = resolver.resolve(bet, Price.fromUsd('51000'));
      expect(result.netWinAmount.toNumber()).toBeCloseTo(469);
    });

    it('lost: netWinAmount is 0', () => {
      const bet = makeBet('up', 2);
      const result = resolver.resolve(bet, Price.fromUsd('49000'));
      expect(result.netWinAmount.toNumber()).toBe(0);
    });

    it('cancelled: netWinAmount equals original amount (full refund)', () => {
      const bet = makeBet('up', 2);
      const result = resolver.resolve(bet, Price.fromUsd('50000'));
      expect(result.netWinAmount.toNumber()).toBe(100);
    });
  });
});
