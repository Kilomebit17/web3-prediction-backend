import { GetCoinUseCase } from './get-coin.use-case';
import type { ICoinRepository, CoinDTO } from '../../ports';

describe('GetCoinUseCase', () => {
  it('should return coin by ID', async () => {
    const repo = {
      findById: jest.fn<Promise<CoinDTO | null>, [string]>(),
      findAll: jest.fn(),
      findActive: jest.fn(),
      findCandles: jest.fn(),
    } as jest.Mocked<ICoinRepository>;

    const btc: CoinDTO = { id: 'btc', symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT', iconUrl: null, color: null, isActive: true, sortOrder: 0 };
    repo.findById.mockResolvedValue(btc);

    const uc = new GetCoinUseCase(repo);
    const result = await uc.execute('btc');

    expect(result.id).toBe('btc');
    expect(result.symbol).toBe('BTC');
  });

  it('should throw NOT_FOUND for missing coin', async () => {
    const repo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findActive: jest.fn(),
      findCandles: jest.fn(),
    } as jest.Mocked<ICoinRepository>;

    repo.findById.mockResolvedValue(null);

    const uc = new GetCoinUseCase(repo);
    await expect(uc.execute('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
