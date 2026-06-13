import { Module } from '@nestjs/common';
import {
  CreatePaymentIntentUseCase, ProcessDepositCompletionUseCase,
  DEPOSIT_REPO, TELEGRAM_STARS_ADAPTER,
  USER_REPOSITORY, TRANSACTION_REPOSITORY, EVENT_BUS,
} from '@pred/application';
import {
  DepositRepository, TelegramStarsAdapter,
  UserRepository, TransactionRepository, InMemoryEventBus,
} from '@pred/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [
    CreatePaymentIntentUseCase,
    ProcessDepositCompletionUseCase,
    TelegramStarsAdapter,
    { provide: DEPOSIT_REPO, useClass: DepositRepository },
    { provide: TELEGRAM_STARS_ADAPTER, useExisting: TelegramStarsAdapter },
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionRepository },
    { provide: EVENT_BUS, useClass: InMemoryEventBus },
  ],
})
export class PaymentsModule {}
