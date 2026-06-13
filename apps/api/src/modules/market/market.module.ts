import { Module } from '@nestjs/common';
import {
  PurchaseSubscriptionUseCase, GetSubscriptionsUseCase,
  SUB_REPOSITORY, USER_REPOSITORY, UNIT_OF_WORK, EVENT_BUS,
} from '@pred/application';
import {
  UserRepository, PrismaUnitOfWork, InMemoryEventBus,
  SubscriptionRepository,
} from '@pred/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketController } from './market.controller';

@Module({
  imports: [AuthModule],
  controllers: [MarketController],
  providers: [
    PurchaseSubscriptionUseCase,
    GetSubscriptionsUseCase,
    { provide: SUB_REPOSITORY, useClass: SubscriptionRepository },
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork },
    { provide: EVENT_BUS, useClass: InMemoryEventBus },
  ],
})
export class MarketModule {}
