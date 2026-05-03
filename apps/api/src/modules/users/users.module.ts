import { Module } from '@nestjs/common';
import {
  GetCurrentUserUseCase,
  UpdateUsernameUseCase,
  GetUserStatsUseCase,
  LinkWalletUseCase,
  USER_REPOSITORY,
  DEPOSIT_REPO,
  EVENT_BUS,
  CACHE_PROVIDER,
} from '@pred/application';
import {
  UserRepository,
  DepositRepository,
  RedisCacheService,
  InMemoryEventBus,
} from '@pred/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [AuthModule], // For JwtAuthGuard
  controllers: [UsersController, WalletsController],
  providers: [
    GetCurrentUserUseCase,
    UpdateUsernameUseCase,
    GetUserStatsUseCase,
    LinkWalletUseCase,
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: DEPOSIT_REPO, useClass: DepositRepository },
    { provide: EVENT_BUS, useClass: InMemoryEventBus },
    { provide: CACHE_PROVIDER, useExisting: RedisCacheService },
  ],
})
export class UsersModule {}
