import { Module } from '@nestjs/common';
import { GetLeaderboardUseCase, CACHE_PROVIDER } from '@pred/application';
import { RedisModule, RedisCacheService } from '@pred/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [RedisModule, AuthModule],
  controllers: [LeaderboardController],
  providers: [
    GetLeaderboardUseCase,
    { provide: CACHE_PROVIDER, useExisting: RedisCacheService },
  ],
})
export class LeaderboardModule {}
