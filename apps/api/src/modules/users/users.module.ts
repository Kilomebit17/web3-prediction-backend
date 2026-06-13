import { Module } from '@nestjs/common';
import {
  GetCurrentUserUseCase,
  USER_REPOSITORY,
  DEPOSIT_REPO,
  EVENT_BUS,
} from '@pred/application';
import {
  UserRepository,
  DepositRepository,
  InMemoryEventBus,
} from '@pred/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';

@Module({
  imports: [AuthModule], // For JwtAuthGuard
  controllers: [UsersController],
  providers: [
    GetCurrentUserUseCase,
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: DEPOSIT_REPO, useClass: DepositRepository },
    { provide: EVENT_BUS, useClass: InMemoryEventBus },
  ],
})
export class UsersModule {}
