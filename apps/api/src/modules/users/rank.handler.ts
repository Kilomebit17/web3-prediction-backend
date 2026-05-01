import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import {
  RankCalculator, RankUpgraded, Money,
  type UserBalanceChanged,
} from '@pred/domain';
import { Rank } from '@pred/domain';
import {
  EVENT_BUS, USER_REPOSITORY,
  type IEventBus, type IUserRepository,
} from '@pred/application';

const RANKS: Rank[] = [
  { id: 'j1', name: 'J-1', minBalance: Money.fromPred(0), tierOrder: 1 },
  { id: 'e2', name: 'E-2', minBalance: Money.fromPred(1000), tierOrder: 2 },
  { id: 's3', name: 'S-3', minBalance: Money.fromPred(100000), tierOrder: 3 },
  { id: 'u4', name: 'U-4', minBalance: Money.fromPred(1000000), tierOrder: 4 },
  { id: 's5', name: 'S-5', minBalance: Money.fromPred(3000000), tierOrder: 5 },
];

function getRanks(): { id: string; name: string; minBalance: string; tierOrder: number }[] {
  return RANKS.map((r) => ({ id: r.id, name: r.name, minBalance: r.minBalance.toString(), tierOrder: r.tierOrder }));
}

@Injectable()
export class RankEventHandler implements OnModuleInit {
  private readonly calculator = new RankCalculator(RANKS);

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe<UserBalanceChanged>(
      'UserBalanceChanged',
      async (event) => {
        if (!event.userId) return;

        const user = await this.userRepo.findById(event.userId);
        if (!user) return;

        const newRank = this.calculator.calculate(user.balance);

        // Compare with previous rank and emit if changed
        const prevRankId = 'j1'; // Simplified — full impl stores current rank on user
        if (newRank.id !== prevRankId) {
          await this.eventBus.publish(
            new RankUpgraded(user.id, prevRankId, newRank.id),
          );
        }
      },
    );
  }

  static getRanks() {
    return getRanks();
  }
}
