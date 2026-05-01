import { Module, OnModuleInit, Inject } from '@nestjs/common';
import {
  PlaceBetUseCase, CancelBetUseCase, GetBetHistoryUseCase,
  ApplyReferralRewardUseCase, CalculateRankUseCase,
  REFERRAL_REPO,
  SUB_REPOSITORY, USER_REPOSITORY, BET_REPOSITORY, TRANSACTION_REPOSITORY,
  UNIT_OF_WORK, EVENT_BUS, CACHE_PROVIDER, COIN_REPOSITORY, PRICE_PROVIDER, QUEUE_PUBLISHER,
} from '@pred/application';
import {
  UserRepository, BetRepository, TransactionRepository, CoinRepository,
  SubscriptionRepository, ReferralRepository,
  PrismaUnitOfWork, InMemoryEventBus,
  RedisCacheService, BinancePriceProvider, BullMqPublisher, BullMqModule,
} from '@pred/infrastructure';
import { BetPlaced, BetResolved, UserBalanceChanged } from '@pred/domain';
import { AuthModule } from '../auth/auth.module';
import { BetsController } from './bets.controller';
import { PricesGateway, UserGateway } from './ws.gateway';

@Module({
  imports: [AuthModule, BullMqModule],
  controllers: [BetsController],
  providers: [
    PlaceBetUseCase, CancelBetUseCase, GetBetHistoryUseCase,
    ApplyReferralRewardUseCase, CalculateRankUseCase,
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: BET_REPOSITORY, useClass: BetRepository },
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionRepository },
    { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork },
    { provide: EVENT_BUS, useClass: InMemoryEventBus },
    { provide: CACHE_PROVIDER, useExisting: RedisCacheService },
    { provide: PRICE_PROVIDER, useClass: BinancePriceProvider },
    { provide: QUEUE_PUBLISHER, useClass: BullMqPublisher },
    { provide: SUB_REPOSITORY, useClass: SubscriptionRepository },
    { provide: REFERRAL_REPO, useClass: ReferralRepository },
    { provide: COIN_REPOSITORY, useClass: CoinRepository },
    CoinRepository,
    PricesGateway, UserGateway,
  ],
})
export class BetsModule implements OnModuleInit {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: InMemoryEventBus,
    private readonly userGateway: UserGateway,
    private readonly pricesGateway: PricesGateway,
    private readonly applyReferralReward: ApplyReferralRewardUseCase,
    private readonly calculateRank: CalculateRankUseCase,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe<BetPlaced>('BetPlaced', async (event) => {
      this.userGateway.broadcastBetPlaced(event.userId, {
        betId: event.betId, userId: event.userId, coinId: event.coinId,
        amount: event.amount, multiplier: event.multiplier,
      });
    });

    this.eventBus.subscribe<BetResolved>('BetResolved', async (event) => {
      this.userGateway.broadcastBetResolved(event.userId, {
        betId: event.betId, userId: event.userId,
        status: event.status, netWinAmount: event.netWinAmount,
      });

      // #11: Apply referral reward on bet win
      if (event.status === 'won') {
        await this.applyReferralReward.onBetWon(event.userId, event.netWinAmount);
      }
    });

    this.eventBus.subscribe<UserBalanceChanged>('UserBalanceChanged', async (event) => {
      this.userGateway.broadcastBalanceChanged(event.userId, '0', event.delta, event.reason);

      // #10: Recalculate rank on balance change
      await this.calculateRank.execute(event.userId);
    });
  }
}
