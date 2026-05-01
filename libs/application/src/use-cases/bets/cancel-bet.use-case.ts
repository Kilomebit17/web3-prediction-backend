import { Injectable, Inject } from '@nestjs/common';
import { Bet, BetResolved, UserBalanceChanged } from '@pred/domain';
import {
  BET_REPOSITORY,
  USER_REPOSITORY,
  UNIT_OF_WORK,
  EVENT_BUS,
  CACHE_PROVIDER,
  type IBetRepository,
  type IUserRepository,
  type IUnitOfWork,
  type IEventBus,
  type ICacheProvider,
} from '../../ports';
import type { BetDTO } from './place-bet.use-case';

export interface CancelBetInput {
  userId: string;
  betId: string;
}

@Injectable()
export class CancelBetUseCase {
  constructor(
    @Inject(BET_REPOSITORY) private readonly betRepo: IBetRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async execute(input: CancelBetInput): Promise<BetDTO> {
    return this.uow.withTransaction(async () => {
      const bet = await this.betRepo.findById(input.betId);
      if (!bet) {
        throw Object.assign(new Error('Bet not found'), { code: 'NOT_FOUND' });
      }
      if (bet.userId !== input.userId) {
        throw Object.assign(new Error('Not your bet'), { code: 'FORBIDDEN' });
      }
      if (bet.status !== 'active') {
        throw Object.assign(new Error('Bet already resolved'), { code: 'BET_EXPIRED' });
      }
      if (bet.isExpired(new Date())) {
        throw Object.assign(new Error('Bet has expired'), { code: 'BET_EXPIRED' });
      }

      bet.cancel('User cancelled');
      await this.betRepo.update(bet);

      // Refund
      const user = await this.userRepo.findById(input.userId);
      if (user) {
        user.credit(bet.amount, 'bet_refund', {
          referenceType: 'bet',
          referenceId: bet.id,
        });
        await this.userRepo.update(user);
      }

      // Invalidate cache
      await this.cache.del(`user:${input.userId}:profile`);

      // Events
      await this.eventBus.publish(
        new BetResolved(bet.id, bet.userId, 'cancelled', bet.amount.toString()),
      );
      await this.eventBus.publish(
        new UserBalanceChanged(bet.userId, bet.amount.toString(), 'bet_refund'),
      );

      return toBetDto(bet);
    });
  }
}

export function toBetDto(bet: Bet): BetDTO {
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
