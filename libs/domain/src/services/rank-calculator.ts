import type { Money } from '../value-objects/money.vo';
import type { Rank } from '../value-objects/rank.vo';

export class RankCalculator {
  constructor(private readonly ranks: Rank[]) {}

  calculate(balance: Money): Rank {
    // Find the highest rank whose minBalance ≤ balance
    const sorted = [...this.ranks].sort((a, b) => b.tierOrder - a.tierOrder);
    const rank = sorted.find((r) => balance.gte(r.minBalance));
    if (!rank) throw new RangeError('RankCalculator: no ranks configured (expected at least J-1 with minBalance=0)');
    return rank;
  }
}
