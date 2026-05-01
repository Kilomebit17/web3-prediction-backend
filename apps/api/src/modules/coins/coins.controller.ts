import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  GetCoinsUseCase,
  GetCoinUseCase,
  GetCoinPriceUseCase,
  GetCandlesUseCase,
} from '@pred/application';
import type { CoinDTO, CandleDTO, CoinPriceResponse } from '@pred/application';

@ApiTags('Coins')
@Controller({ path: 'coins', version: '1' })
export class CoinsController {
  constructor(
    private readonly getCoins: GetCoinsUseCase,
    private readonly getCoin: GetCoinUseCase,
    private readonly getCoinPrice: GetCoinPriceUseCase,
    private readonly getCandlesUseCase: GetCandlesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active coins' })
  @ApiResponse({ status: 200, description: 'Coin list' })
  async findAll(): Promise<CoinDTO[]> {
    return this.getCoins.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coin by ID' })
  @ApiResponse({ status: 200, description: 'Coin detail' })
  @ApiResponse({ status: 404, description: 'Coin not found' })
  async findOne(@Param('id') id: string): Promise<CoinDTO> {
    try {
      return await this.getCoin.execute(id);
    } catch (err) {
      if (err instanceof Error && 'code' in err && (err as Error & { code: string }).code === 'NOT_FOUND') {
        throw new HttpException(
          { type: 'https://pred.game/errors/not-found', title: err.message, status: 404, code: 'NOT_FOUND' },
          404,
        );
      }
      throw err;
    }
  }

  @Get(':id/price')
  @ApiOperation({ summary: 'Get current coin price' })
  @ApiResponse({ status: 200, description: 'Current price' })
  async getPrice(@Param('id') id: string): Promise<CoinPriceResponse> {
    return this.getCoinPrice.execute(id);
  }

  @Get(':id/candles')
  @ApiOperation({ summary: 'Get OHLC candles' })
  @ApiResponse({ status: 200, description: 'Candles array' })
  async getCandles(
    @Param('id') id: string,
    @Query('interval') interval: string,
    @Query('limit') limit: string,
  ): Promise<CandleDTO[]> {
    try {
      return await this.getCandlesUseCase.execute(
        id,
        interval ?? '1m',
        parseInt(limit ?? '100', 10),
      );
    } catch (err) {
      if (err instanceof Error && 'code' in err) {
        const e = err as Error & { code: string };
        if (e.code === 'INVALID_INPUT') {
          throw new HttpException(
            { type: 'https://pred.game/errors/invalid-input', title: e.message, status: 400, code: 'INVALID_INPUT' },
            400,
          );
        }
        if (e.code === 'NOT_FOUND') {
          throw new HttpException(
            { type: 'https://pred.game/errors/not-found', title: e.message, status: 404, code: 'NOT_FOUND' },
            404,
          );
        }
      }
      throw err;
    }
  }
}
