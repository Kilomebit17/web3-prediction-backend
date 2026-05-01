import { GetCandlesUseCase } from './get-candles.use-case';
import { Price } from '@pred/domain';
import type { ICoinRepository, CoinDTO, CandleDTO } from '../../ports';

describe('GetCandlesUseCase', () => {
  const coin: CoinDTO = { id: 'btc', symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT', iconUrl: null, color: null, isActive: true, sortOrder: 0 };

  it('should return candles', async () => {
    const repo = {
      findById: jest.fn<Promise<CoinDTO | null>, [string]>(),
      findCandles: jest.fn<Promise<CandleDTO[]>, [string, string, number]>(),
      findAll: jest.fn(),
      findActive: jest.fn(),
    } as jest.Mocked<ICoinRepository>;

    const candles: CandleDTO[] = [{
      coinId: 'btc', interval: '1m',
      openTime: new Date(), open: Price.fromUsd('50000'),
      high: Price.fromUsd('51000'), low: Price.fromUsd('49000'),
      close: Price.fromUsd('50500'), volume: Price.fromUsd('100'),
      closeTime: new Date(),
    }];

    repo.findById.mockResolvedValue(coin);
    repo.findCandles.mockResolvedValue(candles);

    const uc = new GetCandlesUseCase(repo);
    const result = await uc.execute('btc', '1m', 10);

    expect(result).toHaveLength(1);
    expect(result[0].open.toString()).toContain('50000');
  });

  it('should clamp limit to 1-500', async () => {
    const repo = {
      findById: jest.fn<Promise<CoinDTO | null>, [string]>(),
      findCandles: jest.fn<Promise<CandleDTO[]>, [string, string, number]>(),
      findAll: jest.fn(),
      findActive: jest.fn(),
    } as jest.Mocked<ICoinRepository>;

    repo.findById.mockResolvedValue(coin);
    repo.findCandles.mockResolvedValue([]);

    const uc = new GetCandlesUseCase(repo);

    await uc.execute('btc', '1m', 0);
    expect(repo.findCandles).toHaveBeenCalledWith('btc', '1m', 1);

    await uc.execute('btc', '1m', 999);
    expect(repo.findCandles).toHaveBeenCalledWith('btc', '1m', 500);
  });

  it('should throw INVALID_INPUT for bad interval', async () => {
    const repo = {
      findById: jest.fn<Promise<CoinDTO | null>, [string]>(),
      findCandles: jest.fn(),
      findAll: jest.fn(),
      findActive: jest.fn(),
    } as jest.Mocked<ICoinRepository>;

    repo.findById.mockResolvedValue(coin);

    const uc = new GetCandlesUseCase(repo);
    await expect(uc.execute('btc', '3m', 10)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(uc.execute('btc', '1w', 10)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('should throw NOT_FOUND for missing coin', async () => {
    const repo = {
      findById: jest.fn(),
      findCandles: jest.fn(),
      findAll: jest.fn(),
      findActive: jest.fn(),
    } as jest.Mocked<ICoinRepository>;

    repo.findById.mockResolvedValue(null);

    const uc = new GetCandlesUseCase(repo);
    await expect(uc.execute('nope', '1m', 10)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
