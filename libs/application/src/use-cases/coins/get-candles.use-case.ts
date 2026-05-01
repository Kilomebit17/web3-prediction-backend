import { Injectable, Inject } from '@nestjs/common';
import {
  COIN_REPOSITORY,
  type ICoinRepository,
  type CandleDTO,
} from '../../ports';

const ALLOWED_INTERVALS = ['1m', '5m', '1h', '4h', '1d'];

@Injectable()
export class GetCandlesUseCase {
  constructor(
    @Inject(COIN_REPOSITORY) private readonly coinRepo: ICoinRepository,
  ) {}

  async execute(
    coinId: string,
    interval: string,
    limit: number,
  ): Promise<CandleDTO[]> {
    if (!ALLOWED_INTERVALS.includes(interval)) {
      throw Object.assign(new Error(`Invalid interval: ${interval}`), {
        code: 'INVALID_INPUT',
      });
    }

    const clampedLimit = Math.max(1, Math.min(500, limit));

    const coin = await this.coinRepo.findById(coinId);
    if (!coin) {
      throw Object.assign(new Error(`Coin not found: ${coinId}`), {
        code: 'NOT_FOUND',
      });
    }

    return this.coinRepo.findCandles(coinId, interval, clampedLimit);
  }
}
