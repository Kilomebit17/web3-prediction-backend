import { Injectable, Inject } from '@nestjs/common';
import {
  COIN_REPOSITORY,
  CACHE_PROVIDER,
  PRICE_PROVIDER,
  type ICoinRepository,
  type ICacheProvider,
  type IPriceProvider,
} from '../../ports';

export interface CoinPriceResponse {
  coinId: string;
  price: string;
  change24h: string;
  ts: string;
}

@Injectable()
export class GetCoinPriceUseCase {
  constructor(
    @Inject(COIN_REPOSITORY) private readonly coinRepo: ICoinRepository,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    @Inject(PRICE_PROVIDER) private readonly priceProvider: IPriceProvider,
  ) {}

  async execute(coinId: string): Promise<CoinPriceResponse> {
    const coin = await this.coinRepo.findById(coinId);
    if (!coin) {
      throw Object.assign(new Error(`Coin not found: ${coinId}`), {
        code: 'NOT_FOUND',
      });
    }

    // Try Redis price cache (populated by price-poller in Phase 1.11)
    const cachedPrice = await this.cache.get<{ price: string; ts: number }>(
      `price:${coinId}:latest`,
    );

    if (cachedPrice) {
      return {
        coinId,
        price: cachedPrice.price,
        change24h: '0',
        ts: new Date(cachedPrice.ts).toISOString(),
      };
    }

    // Fallback: fetch from Binance directly
    try {
      const price = await this.priceProvider.getCurrent(coinId);
      return {
        coinId,
        price: price.toString(),
        change24h: '0',
        ts: new Date().toISOString(),
      };
    } catch {
      return {
        coinId,
        price: '0',
        change24h: '0',
        ts: new Date().toISOString(),
      };
    }
  }
}
