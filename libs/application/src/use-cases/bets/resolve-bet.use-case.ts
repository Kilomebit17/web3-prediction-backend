import { Injectable, Inject } from '@nestjs/common';
import { BetResolved, UserBalanceChanged, ScoreCalculator } from '@pred/domain';
import {
  BET_REPOSITORY, USER_REPOSITORY, TRANSACTION_REPOSITORY,
  UNIT_OF_WORK, EVENT_BUS, CACHE_PROVIDER, PRICE_PROVIDER,
  type IBetRepository, type IUserRepository, type ITransactionRepository,
  type IUnitOfWork, type IEventBus, type ICacheProvider, type IPriceProvider,
} from '../../ports';

export interface ResolveBetInput {
  betId: string;
}

@Injectable()
export class ResolveBetUseCase {
  private readonly scoreCalc = new ScoreCalculator();

  constructor(
    @Inject(BET_REPOSITORY) private readonly betRepo: IBetRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    @Inject(PRICE_PROVIDER) private readonly priceProvider: IPriceProvider,
  ) {}

  async execute(input: ResolveBetInput): Promise<void> {
    await this.uow.withTransaction(async () => {
      const bet = await this.betRepo.findById(input.betId);
      if (!bet || bet.status !== 'active') return;

      // Fetch end price with dual-source validation
      const endPrice = await this.priceProvider.getAt(bet.coinId, bet.expiresAt, 2);
      const secondaryPrice = await this.priceProvider.getCurrent(bet.coinId);
      const priceDiff = Math.abs(
        (endPrice.toNumber() - secondaryPrice.toNumber()) / endPrice.toNumber(),
      );

      const resolution = priceDiff > 0.005
        ? { status: 'cancelled' as const, netWinAmount: bet.amount }
        : bet.resolve(endPrice);
      await this.betRepo.update(bet);

      const user = await this.userRepo.findById(bet.userId);
      if (!user) return;

      if (resolution.status === 'won') {
        // #8: Save transaction
        const tx = user.credit(resolution.netWinAmount, 'bet_won', {
          referenceType: 'bet', referenceId: bet.id,
        });
        await this.txRepo.create(tx);

        user.stats.totalWins++;
        if (user.stats.totalWins > user.stats.bestWinStreak) {
          user.stats.bestWinStreak = user.stats.totalWins;
        }
        // #5: Update score via ScoreCalculator
        user.stats.score += this.scoreCalc.delta(bet.multiplier.value, 'won');
      } else if (resolution.status === 'lost') {
        user.stats.totalLosses++;
        // #5: Update score via ScoreCalculator
        user.stats.score += this.scoreCalc.delta(bet.multiplier.value, 'lost');
      } else {
        // cancelled — refund
        const tx = user.credit(resolution.netWinAmount, 'bet_refund', {
          referenceType: 'bet', referenceId: bet.id,
        });
        await this.txRepo.create(tx);
      }

      await this.userRepo.update(user);

      // Redis cache invalidation
      await this.cache.set(`user:${bet.userId}:profile`, '', 1);
      await this.cache.lpush(`user:${bet.userId}:resolved_bets`, bet.id);

      // Leaderboard score updates
      const member = `${user.id}:${user.username ?? ''}:${user.stats.score}:${user.balance.toString()}`;
      await this.cache.zadd('leaderboard:score:all', Number(user.stats.score), member);
      await this.cache.zadd('leaderboard:score:weekly', Number(user.stats.score), member);

      // Events
      await this.eventBus.publish(
        new BetResolved(bet.id, bet.userId, resolution.status, resolution.netWinAmount.toString()),
      );
      if (resolution.status === 'won' || resolution.status === 'cancelled') {
        await this.eventBus.publish(
          new UserBalanceChanged(bet.userId, resolution.netWinAmount.toString(),
            resolution.status === 'won' ? 'bet_won' : 'bet_refund'),
        );
      }
    });
  }
}
