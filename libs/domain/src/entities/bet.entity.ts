import { randomUUID } from 'crypto';
import { BetAlreadyResolvedError } from '../errors/bet-already-resolved.error';
import { BetExpiredError } from '../errors/bet-expired.error';
import type { Direction } from '../value-objects/direction.vo';
import type { Money } from '../value-objects/money.vo';
import type { Multiplier } from '../value-objects/multiplier.vo';
import type { Price } from '../value-objects/price.vo';

export type BetStatus = 'active' | 'won' | 'lost' | 'cancelled';

export interface BetResolution {
  status: 'won' | 'lost' | 'cancelled';
  netWinAmount: Money;
}

export interface PlaceBetInput {
  userId: string;
  coinId: string;
  direction: Direction;
  amount: Money;
  multiplier: Multiplier;
  durationSeconds: number;
  entryPrice: Price;
  placedAt?: Date;
}

export class Bet {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly coinId: string,
    public readonly direction: Direction,
    public readonly amount: Money,
    public readonly multiplier: Multiplier,
    public readonly durationSeconds: number,
    public readonly entryPrice: Price,
    public endPrice: Price | null,
    public status: BetStatus,
    public netWinAmount: Money | null,
    public readonly placedAt: Date,
    public readonly expiresAt: Date,
    public resolvedAt: Date | null,
  ) {}

  static create(input: PlaceBetInput): Bet {
    const now = input.placedAt ?? new Date();
    const expiresAt = new Date(now.getTime() + input.durationSeconds * 1000);
    return new Bet(
      randomUUID(),
      input.userId,
      input.coinId,
      input.direction,
      input.amount,
      input.multiplier,
      input.durationSeconds,
      input.entryPrice,
      null,
      'active',
      null,
      now,
      expiresAt,
      null,
    );
  }

  resolve(endPrice: Price): BetResolution {
    if (this.status !== 'active') throw new BetAlreadyResolvedError(this.id);

    let status: 'won' | 'lost' | 'cancelled';
    let netWinAmount: Money;

    if (endPrice.eq(this.entryPrice)) {
      status = 'cancelled';
      netWinAmount = this.amount; // full refund on tie
    } else {
      const won =
        this.direction === 'up' ? endPrice.gt(this.entryPrice) : endPrice.lt(this.entryPrice);

      if (won) {
        status = 'won';
        // netWin = amount + amount * (multiplier - 1) * (1 - liquidationPercent / 100)
        const retentionFactor = (this.multiplier.value - 1) * (1 - this.multiplier.liquidationPercent / 100);
        netWinAmount = this.amount.add(this.amount.mul(retentionFactor));
      } else {
        status = 'lost';
        netWinAmount = this.amount.mul(0); // Money.zero() equivalent
      }
    }

    this.status = status;
    this.endPrice = endPrice;
    this.netWinAmount = netWinAmount;
    this.resolvedAt = new Date();

    return { status, netWinAmount };
  }

  cancel(reason: string): void {
    if (this.status !== 'active') throw new BetAlreadyResolvedError(this.id);
    if (this.isExpired(new Date())) throw new BetExpiredError(this.id);
    void reason; // stored in bet_events at application layer
    this.status = 'cancelled';
    this.netWinAmount = this.amount;
    this.resolvedAt = new Date();
  }

  isExpired(now: Date): boolean {
    return now >= this.expiresAt;
  }
}
