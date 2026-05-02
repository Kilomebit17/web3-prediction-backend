import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { CACHE_PROVIDER } from '@pred/application';
import { RedisModule, RedisCacheService } from '@pred/infrastructure';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@Module({
  imports: [TerminusModule, RedisModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    { provide: CACHE_PROVIDER, useExisting: RedisCacheService },
  ],
})
export class HealthModule {}
