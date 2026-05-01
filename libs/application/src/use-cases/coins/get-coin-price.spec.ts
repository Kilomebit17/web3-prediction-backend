import { GetCoinPriceUseCase } from './get-coin-price.use-case';
import type { ICoinRepository, ICacheProvider, IPriceProvider, CoinDTO } from '../../ports';
import { Price } from '@pred/domain';

describe('GetCoinPriceUseCase', () => {
  const btc: CoinDTO = { id: 'btc', symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT', iconUrl: null, color: null, isActive: true, sortOrder: 0 };

  it('should return Redis cached price when available', async () => {
    const coinRepo = { findById: jest.fn<Promise<CoinDTO | null>, [string]>() } as unknown as jest.Mocked<ICoinRepository>;
    const cache = {
      get: jest.fn<Promise<unknown | null>, [string]>(),
    } as unknown as jest.Mocked<ICacheProvider>;
    const priceProvider = {} as jest.Mocked<IPriceProvider>;

    coinRepo.findById.mockResolvedValue(btc);
    cache.get.mockResolvedValue({ price: '50000.00000000', ts: 1700000000000 });

    const uc = new GetCoinPriceUseCase(coinRepo, cache, priceProvider);
    const result = await uc.execute('btc');

    expect(result.price).toBe('50000.00000000');
  });

  it('should fallback to Binance when no cache', async () => {
    const coinRepo = { findById: jest.fn<Promise<CoinDTO | null>, [string]>() } as unknown as jest.Mocked<ICoinRepository>;
    const cache = {
      get: jest.fn<Promise<unknown | null>, [string]>(),
    } as unknown as jest.Mocked<ICacheProvider>;
    const priceProvider = { getCurrent: jest.fn() } as unknown as jest.Mocked<IPriceProvider>;

    coinRepo.findById.mockResolvedValue(btc);
    cache.get.mockResolvedValue(null);
    priceProvider.getCurrent.mockResolvedValue(Price.fromUsd('42000'));

    const uc = new GetCoinPriceUseCase(coinRepo, cache, priceProvider);
    const result = await uc.execute('btc');

    expect(result.price).toContain('42000');
  });

  it('should return zero on all failures', async () => {
    const coinRepo = { findById: jest.fn<Promise<CoinDTO | null>, [string]>() } as unknown as jest.Mocked<ICoinRepository>;
    const cache = {
      get: jest.fn<Promise<unknown | null>, [string]>(),
    } as unknown as jest.Mocked<ICacheProvider>;
    const priceProvider = { getCurrent: jest.fn() } as unknown as jest.Mocked<IPriceProvider>;

    coinRepo.findById.mockResolvedValue(btc);
    cache.get.mockResolvedValue(null);
    priceProvider.getCurrent.mockRejectedValue(new Error('Network error'));

    const uc = new GetCoinPriceUseCase(coinRepo, cache, priceProvider);
    const result = await uc.execute('btc');

    expect(result.price).toBe('0');
  });
});
