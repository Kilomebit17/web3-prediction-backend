import { Module } from '@nestjs/common';
import { AdminUsersUseCase, USER_REPOSITORY, UNIT_OF_WORK, EVENT_BUS, CACHE_PROVIDER } from '@pred/application';
import { RedisModule, UserRepository, PrismaUnitOfWork, InMemoryEventBus, RedisCacheService } from '@pred/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [RedisModule, AuthModule],
  controllers: [AdminController],
  providers: [
    AdminUsersUseCase,
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork },
    { provide: EVENT_BUS, useClass: InMemoryEventBus },
    { provide: CACHE_PROVIDER, useExisting: RedisCacheService },
  ],
})
export class AdminModule {}
