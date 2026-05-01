import { Injectable, Inject } from '@nestjs/common';
import {
  COIN_REPOSITORY,
  type ICoinRepository,
  type CoinDTO,
} from '../../ports';

@Injectable()
export class GetCoinUseCase {
  constructor(
    @Inject(COIN_REPOSITORY) private readonly coinRepo: ICoinRepository,
  ) {}

  async execute(coinId: string): Promise<CoinDTO> {
    const coin = await this.coinRepo.findById(coinId);
    if (!coin) {
      throw Object.assign(new Error(`Coin not found: ${coinId}`), {
        code: 'NOT_FOUND',
      });
    }
    return coin;
  }
}
