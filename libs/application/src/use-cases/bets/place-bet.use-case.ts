import { Injectable, Inject } from '@nestjs/common';
import {
  Bet,
  Money,
  Multiplier,
  BetPlaced,
  UserBalanceChanged,
  type PlaceBetInput,
} from '@pred/domain';
import { ALLOWED_DURATIONS_SECONDS } from '@pred/shared';
import {
  USER_REPOSITORY,
  BET_REPOSITORY,
  TRANSACTION_REPOSITORY,
  UNIT_OF_WORK,
  EVENT_BUS,
  CACHE_PROVIDER,
  PRICE_PROVIDER,
  QUEUE_PUBLISHER,
  type IUserRepository,
  type IBetRepository,
  type ITransactionRepository,
  type IUnitOfWork,
  type IEventBus,
  type ICacheProvider,
  type IPriceProvider,
  type IQueuePublisher,
} from '../../ports';
import { SUB_REPOSITORY, type ISubscriptionRepo } from '../market/purchase-subscription.use-case';

export interface PlaceBetInputDto {
  userId: string;
  coinId: string;
  direction: 'up' | 'down';
  amount: string;
  multiplier: number;
  durationSeconds: number;
  idempotencyKey: string;
}

export interface BetDTO {
  id: string;
  userId: string;
  coinId: string;
  direction: 'up' | 'down';
  amount: string;
  multiplier: number;
  liquidationPercent: number;
  durationSeconds: number;
  entryPrice: string;
  endPrice: string | null;
  status: 'active' | 'won' | 'lost' | 'cancelled';
  netWinAmount: string | null;
  placedAt: string;
  expiresAt: string;
  resolvedAt: string | null;
}

@Injectable()
export class PlaceBetUseCase {
  private readonly maxBetPercent: number;

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(BET_REPOSITORY) private readonly betRepo: IBetRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    @Inject(PRICE_PROVIDER) private readonly priceProvider: IPriceProvider,
    @Inject(QUEUE_PUBLISHER) private readonly queue: IQueuePublisher,
    @Inject(SUB_REPOSITORY) private readonly subRepo: ISubscriptionRepo,
  ) {
    this.maxBetPercent = parseInt(
      process.env.MAX_BET_PERCENT_OF_BALANCE ?? '50',
      10,
    );
  }

  async execute(input: PlaceBetInputDto): Promise<BetDTO> {
    // 1. Idempotency check
    const idempotencyKey = `idempotency:${input.idempotencyKey}`;
    const cachedResponse = await this.cache.get<BetDTO>(idempotencyKey);
    if (cachedResponse) return cachedResponse;

    // 2. Validate
    this.validateInput(input);

    // 3. Fetch entry price
    const entryPrice = await this.priceProvider.getCurrent(input.coinId);

    // 4. Transaction
    const bet = await this.uow.withTransaction(async () => {
      // Lock user balance
      const user = await this.userRepo.findById(input.userId);
      if (!user) {
        throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
      }
      if (user.status !== 'active') {
        throw Object.assign(new Error('User is not active'), {
          code: 'FORBIDDEN',
        });
      }

      const amount = Money.fromPred(input.amount);

      // Check balance
      const maxBetAmount = user.balance.mul(this.maxBetPercent / 100);
      if (amount.gt(maxBetAmount)) {
        throw Object.assign(
          new Error(
            `Amount exceeds ${this.maxBetPercent}% of balance (max: ${maxBetAmount.toString()})`,
          ),
          { code: 'INVALID_INPUT', fields: { amount: ['Exceeds maximum bet size'] } },
        );
      }
      if (amount.gt(user.balance)) {
        throw Object.assign(new Error('Insufficient balance'), {
          code: 'INSUFFICIENT_BALANCE',
        });
      }

      const multiplier = Multiplier.of(input.multiplier);

      // Phase 2.3: subscription-gated validation
      await this.validateSubscriptionGates(input.userId, input.multiplier, input.durationSeconds);

      // Create bet
      const betInput: PlaceBetInput = {
        userId: input.userId,
        coinId: input.coinId,
        direction: input.direction,
        amount,
        multiplier,
        durationSeconds: input.durationSeconds,
        entryPrice,
      };
      const bet = Bet.create(betInput);

      // Debit user
      const tx = user.debit(amount, 'bet_placed', {
        referenceType: 'bet',
        referenceId: bet.id,
      });
      tx.constructor.name; // suppress unused — Transaction is used by debit()

      // Persist
      await this.betRepo.create(bet);
      await this.userRepo.update(user);
      await this.txRepo.create(tx);

      return bet;
    });

    // 5. Build DTO (needed for idempotency cache)
    const dto = this.toDto(bet);

    // 6. Post-transaction: best-effort operations — bet is already persisted;
    //    failures here must not prevent returning a successful response.

    // 6a. Cache response for idempotency (awaited to minimize double-bet risk)
    try {
      await this.cache.set(idempotencyKey, JSON.stringify(dto), 86400);
    } catch (err: unknown) {
      console.error('[PlaceBet] idempotency cache error:', (err as Error)?.message);
    }

    // 6b. Events (notifications + rank recalculation)
    this.eventBus.publish(
      new BetPlaced(bet.id, input.userId, input.coinId, input.amount, input.multiplier),
    ).catch((err) => {
      console.error('[PlaceBet] BetPlaced event error:', err?.message);
    });
    this.eventBus.publish(
      new UserBalanceChanged(input.userId, input.amount, 'bet_placed'),
    ).catch((err) => {
      console.error('[PlaceBet] UserBalanceChanged event error:', err?.message);
    });

    // 6c. Schedule resolution (critical — but worker recovers on restart via findExpiredActive)
    this.queue.scheduleBetResolution(bet.id, bet.durationSeconds).catch((err) => {
      console.error(`[PlaceBet] Failed to schedule resolution for bet=${bet.id}:`, err?.message);
    });

    return dto;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async validateSubscriptionGates(
    userId: string,
    multiplier: number,
    durationSeconds: number,
  ): Promise<void> {
    const subs = await this.subRepo.getUserActiveSubscriptions(userId);
    const subIds = new Set(subs.map((s) => s.subscriptionId));

    // Multiplier > 3 requires active multiplier_x<N> subscription
    if (multiplier > 3) {
      if (!subIds.has(`multiplier_x${multiplier}`)) {
        throw Object.assign(
          new Error(`Multiplier ×${multiplier} requires active subscription`),
          { code: 'SUBSCRIPTION_REQUIRED' },
        );
      }
    }

    // 30-second rounds require sniper_round subscription
    if (durationSeconds === 30 && !subIds.has('sniper_round')) {
      throw Object.assign(
        new Error('30-second rounds require Sniper Round subscription'),
        { code: 'SUBSCRIPTION_REQUIRED' },
      );
    }

    // Duration >= 4 hours requires marathon_round subscription
    if (durationSeconds >= 14400 && !subIds.has('marathon_round')) {
      throw Object.assign(
        new Error(`${durationSeconds}s rounds require Marathon Round subscription`),
        { code: 'SUBSCRIPTION_REQUIRED' },
      );
    }
  }

  private validateInput(input: PlaceBetInputDto): void {
    if (input.direction !== 'up' && input.direction !== 'down') {
      throw Object.assign(new Error('Direction must be up or down'), {
        code: 'INVALID_INPUT',
      });
    }
    if (!(ALLOWED_DURATIONS_SECONDS as readonly number[]).includes(input.durationSeconds)) {
      throw Object.assign(
        new Error(`Duration must be one of: ${ALLOWED_DURATIONS_SECONDS.join(', ')}`),
        { code: 'INVALID_INPUT' },
      );
    }
    try {
      Money.fromPred(input.amount);
    } catch {
      throw Object.assign(new Error('Invalid amount format'), {
        code: 'INVALID_INPUT',
      });
    }
    try {
      Multiplier.of(input.multiplier);
    } catch {
      throw Object.assign(new Error('Invalid multiplier'), {
        code: 'INVALID_INPUT',
      });
    }
  }

  private toDto(bet: Bet): BetDTO {
    return {
      id: bet.id,
      userId: bet.userId,
      coinId: bet.coinId,
      direction: bet.direction,
      amount: bet.amount.toString(),
      multiplier: bet.multiplier.value,
      liquidationPercent: bet.multiplier.liquidationPercent,
      durationSeconds: bet.durationSeconds,
      entryPrice: bet.entryPrice.toString(),
      endPrice: bet.endPrice?.toString() ?? null,
      status: bet.status,
      netWinAmount: bet.netWinAmount?.toString() ?? null,
      placedAt: bet.placedAt.toISOString(),
      expiresAt: bet.expiresAt.toISOString(),
      resolvedAt: bet.resolvedAt?.toISOString() ?? null,
    };
  }
}
