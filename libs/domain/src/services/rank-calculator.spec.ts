import { Money } from '../value-objects/money.vo';
import type { Rank } from '../value-objects/rank.vo';
import { RankCalculator } from './rank-calculator';

const ranks: Rank[] = [
  { id: 'j1', name: 'J-1', minBalance: Money.fromPred('0'),       tierOrder: 1 },
  { id: 'e2', name: 'E-2', minBalance: Money.fromPred('1000'),     tierOrder: 2 },
  { id: 's3', name: 'S-3', minBalance: Money.fromPred('100000'),   tierOrder: 3 },
  { id: 'u4', name: 'U-4', minBalance: Money.fromPred('1000000'),  tierOrder: 4 },
  { id: 's5', name: 'S-5', minBalance: Money.fromPred('3000000'),  tierOrder: 5 },
];

describe('RankCalculator', () => {
  const calc = new RankCalculator(ranks);

  it('returns J-1 for 0 balance', () => {
    expect(calc.calculate(Money.fromPred('0')).id).toBe('j1');
  });

  it('returns J-1 for balance below 1000', () => {
    expect(calc.calculate(Money.fromPred('999')).id).toBe('j1');
  });

  it('returns E-2 for exactly 1000', () => {
    expect(calc.calculate(Money.fromPred('1000')).id).toBe('e2');
  });

  it('returns E-2 for 99999', () => {
    expect(calc.calculate(Money.fromPred('99999')).id).toBe('e2');
  });

  it('returns S-3 for exactly 100000', () => {
    expect(calc.calculate(Money.fromPred('100000')).id).toBe('s3');
  });

  it('returns U-4 for exactly 1000000', () => {
    expect(calc.calculate(Money.fromPred('1000000')).id).toBe('u4');
  });

  it('returns S-5 for exactly 3000000', () => {
    expect(calc.calculate(Money.fromPred('3000000')).id).toBe('s5');
  });

  it('returns S-5 for balance above 3000000', () => {
    expect(calc.calculate(Money.fromPred('9999999')).id).toBe('s5');
  });
});
