import { Module } from '@nestjs/common';
import { CreatePaymentIntentUseCase, DEPOSIT_REPO, TELEGRAM_STARS_ADAPTER } from '@pred/application';
import { DepositRepository, TelegramStarsAdapter } from '@pred/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [
    CreatePaymentIntentUseCase,
    TelegramStarsAdapter,
    { provide: DEPOSIT_REPO, useClass: DepositRepository },
    { provide: TELEGRAM_STARS_ADAPTER, useExisting: TelegramStarsAdapter },
    DepositRepository,
  ],
})
export class PaymentsModule {}
