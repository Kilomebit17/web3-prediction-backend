import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from '@pred/infrastructure';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoinsModule } from './modules/coins/coins.module';
import { BetsModule } from './modules/bets/bets.module';
import { MarketModule } from './modules/market/market.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.body.initDataRaw', '*.botToken', '*.password', '*.secret'],
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: false } }
          : undefined,
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CoinsModule,
    BetsModule,
    MarketModule,
    LeaderboardModule,
    ReferralsModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}
