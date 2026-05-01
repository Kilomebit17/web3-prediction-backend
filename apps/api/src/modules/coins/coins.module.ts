import { Module } from '@nestjs/common';
import {
  GetCoinsUseCase,
  GetCoinUseCase,
  GetCoinPriceUseCase,
  GetCandlesUseCase,
  COIN_REPOSITORY,
  CACHE_PROVIDER,
  PRICE_PROVIDER,
} from '@pred/application';
import {
  CoinRepository,
  RedisModule,
  RedisCacheService,
  BinancePriceProvider,
} from '@pred/infrastructure';
import { CoinsController } from './coins.controller';

@Module({
  imports: [RedisModule],
  controllers: [CoinsController],
  providers: [
    GetCoinsUseCase,
    GetCoinUseCase,
    GetCoinPriceUseCase,
    GetCandlesUseCase,
    { provide: COIN_REPOSITORY, useClass: CoinRepository },
    { provide: CACHE_PROVIDER, useExisting: RedisCacheService },
    { provide: PRICE_PROVIDER, useClass: BinancePriceProvider },
  ],
})
export class CoinsModule {}
