import { Module } from '@nestjs/common';
import { GetReferralInfoUseCase, USER_REPOSITORY } from '@pred/application';
import { UserRepository } from '@pred/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { ReferralsController } from './referrals.controller';

@Module({
  imports: [AuthModule],
  controllers: [ReferralsController],
  providers: [
    GetReferralInfoUseCase,
    { provide: USER_REPOSITORY, useClass: UserRepository },
  ],
})
export class ReferralsModule {}
