import { Injectable, Inject } from '@nestjs/common';
import { CatalogCache } from '@pred/shared';
import {
  COIN_REPOSITORY,
  type ICoinRepository,
  type CoinDTO,
} from '../../ports';

const COINS_CACHE_TTL_MS = 30_000;

@Injectable()
export class GetCoinsUseCase {
  private readonly cache = new CatalogCache<CoinDTO[]>(COINS_CACHE_TTL_MS);

  constructor(
    @Inject(COIN_REPOSITORY) private readonly coinRepo: ICoinRepository,
  ) {}

  async execute(): Promise<CoinDTO[]> {
    const cached = this.cache.get();
    if (cached) return cached;

    const coins = await this.coinRepo.findActive();
    this.cache.set(coins);
    return coins;
  }
}
