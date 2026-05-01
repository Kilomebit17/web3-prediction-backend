import { Module } from '@nestjs/common';
import {
  RedisModule,
  TelegramInitDataVerifier,
  JwtService,
  UserRepository,
  BetRepository,
  TransactionRepository,
  CoinRepository,
  ReferralRepository,
  PrismaUnitOfWork,
  InMemoryEventBus,
  RedisCacheService,
} from '@pred/infrastructure';
import {
  AuthenticateWithTelegramUseCase,
  RefreshTokensUseCase,
  LogoutUseCase,
  LogoutAllUseCase,
  REFERRAL_REPO,
  USER_REPOSITORY,
  UNIT_OF_WORK,
  EVENT_BUS,
  TELEGRAM_VERIFIER,
  AUTH_TOKEN_SERVICE,
  CACHE_PROVIDER,
} from '@pred/application';
import { AuthController } from './auth.controller';

@Module({
  imports: [RedisModule],
  controllers: [AuthController],
  providers: [
    // Use cases
    AuthenticateWithTelegramUseCase,
    RefreshTokensUseCase,
    LogoutUseCase,
    LogoutAllUseCase,

    // Port → Adapter bindings
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork },
    { provide: EVENT_BUS, useClass: InMemoryEventBus },
    { provide: CACHE_PROVIDER, useExisting: RedisCacheService },

    // Telegram verifier
    {
      provide: TELEGRAM_VERIFIER,
      useFactory: () => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
        const ttl = parseInt(process.env.TELEGRAM_AUTH_DATA_TTL ?? '86400', 10);
        return new TelegramInitDataVerifier(botToken, ttl);
      },
    },

    // JWT service
    { provide: AUTH_TOKEN_SERVICE, useClass: JwtService },

    // Repository adapters (needed for user lookup within use case)
    UserRepository,
    BetRepository,
    TransactionRepository,
    CoinRepository,
    { provide: REFERRAL_REPO, useClass: ReferralRepository },
  ],
  exports: [
    AUTH_TOKEN_SERVICE,
    AuthenticateWithTelegramUseCase,
    RefreshTokensUseCase,
  ],
})
export class AuthModule {}
