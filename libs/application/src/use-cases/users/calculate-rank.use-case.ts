import { Injectable, Inject } from '@nestjs/common';
import { RankCalculator, RankUpgraded, Money } from '@pred/domain';
import { Rank } from '@pred/domain';
import {
  USER_REPOSITORY,
  EVENT_BUS,
  CACHE_PROVIDER,
  type IUserRepository,
  type IEventBus,
  type ICacheProvider,
} from '../../ports';

const RANKS: Rank[] = [
  { id: 'j1', name: 'J-1', minBalance: Money.fromPred(0), tierOrder: 1 },
  { id: 'e2', name: 'E-2', minBalance: Money.fromPred(1000), tierOrder: 2 },
  { id: 's3', name: 'S-3', minBalance: Money.fromPred(100000), tierOrder: 3 },
  { id: 'u4', name: 'U-4', minBalance: Money.fromPred(1000000), tierOrder: 4 },
  { id: 's5', name: 'S-5', minBalance: Money.fromPred(3000000), tierOrder: 5 },
];

@Injectable()
export class CalculateRankUseCase {
  private readonly calculator = new RankCalculator(RANKS);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) return;

    const newRank = this.calculator.calculate(user.balance);
    const previousRankId = await this.cache.get<string>(`user:${userId}:rank`);
    const newMember = `${user.id}:${user.username ?? ''}:${user.stats.score}:${user.balance.toString()}`;

    if (previousRankId && previousRankId !== newRank.id) {
      // Rank changed — remove old entries from old rank, add to new rank
      await this.cache.zremByUser(`leaderboard:${previousRankId}:score`, userId);
      await this.cache.zadd(`leaderboard:${newRank.id}:score`, Number(user.stats.score), newMember);

      await this.eventBus.publish(new RankUpgraded(userId, previousRankId, newRank.id));
    } else {
      // Same rank — remove all existing entries for this user, then add updated one
      await this.cache.zremByUser(`leaderboard:${newRank.id}:score`, userId);
      await this.cache.zadd(`leaderboard:${newRank.id}:score`, Number(user.stats.score), newMember);
    }

    await this.cache.set(`user:${userId}:rank`, newRank.id, 0);
    await this.cache.set(`user:${userId}:member`, newMember, 0);
  }

  static getRanks() {
    return RANKS.map((r) => ({
      id: r.id,
      name: r.name,
      minBalance: r.minBalance.toString(),
      tierOrder: r.tierOrder,
    }));
  }
}
