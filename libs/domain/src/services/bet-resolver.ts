import type { BetResolution } from '../entities/bet.entity';
import type { Bet } from '../entities/bet.entity';
import { Money } from '../value-objects/money.vo';
import type { Price } from '../value-objects/price.vo';

// Pure stateless domain service — no mutations, no side effects
export class BetResolver {
  resolve(bet: Bet, endPrice: Price): BetResolution {
    if (endPrice.eq(bet.entryPrice)) {
      return { status: 'cancelled', netWinAmount: bet.amount };
    }

    const won =
      bet.direction === 'up' ? endPrice.gt(bet.entryPrice) : endPrice.lt(bet.entryPrice);

    if (!won) {
      return { status: 'lost', netWinAmount: Money.zero() };
    }

    // netWin = amount + amount × (multiplier − 1) × (1 − liquidationPercent / 100)
    const retentionFactor = (bet.multiplier.value - 1) * (1 - bet.multiplier.liquidationPercent / 100);
    const netWinAmount = bet.amount.add(bet.amount.mul(retentionFactor));
    return { status: 'won', netWinAmount };
  }
}
