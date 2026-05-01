import { Module } from '@nestjs/common';
import {
  PurchaseSubscriptionUseCase, ExpireSubscriptionsUseCase, GetSubscriptionsUseCase,
  SUB_REPOSITORY, USER_REPOSITORY, UNIT_OF_WORK, EVENT_BUS, CACHE_PROVIDER,
} from '@pred/application';
import {
  UserRepository, PrismaUnitOfWork, InMemoryEventBus,
  SubscriptionRepository, RedisCacheService,
} from '@pred/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketController } from './market.controller';

@Module({
  imports: [AuthModule],
  controllers: [MarketController],
  providers: [
    PurchaseSubscriptionUseCase,
    ExpireSubscriptionsUseCase,
    GetSubscriptionsUseCase,
    SubscriptionRepository,
    { provide: SUB_REPOSITORY, useClass: SubscriptionRepository },
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork },
    { provide: EVENT_BUS, useClass: InMemoryEventBus },
    { provide: CACHE_PROVIDER, useExisting: RedisCacheService },
  ],
})
export class MarketModule {}
