import { GetCoinsUseCase } from './get-coins.use-case';
import type { ICoinRepository, CoinDTO } from '../../ports';

describe('GetCoinsUseCase', () => {
  it('should return active coins from repository', async () => {
    const repo = {
      findActive: jest.fn<Promise<CoinDTO[]>, []>(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findCandles: jest.fn(),
    } as jest.Mocked<ICoinRepository>;

    const coins: CoinDTO[] = [
      { id: 'btc', symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT', iconUrl: null, color: '#f7931a', isActive: true, sortOrder: 1 },
      { id: 'eth', symbol: 'ETH', name: 'Ethereum', binanceSymbol: 'ETHUSDT', iconUrl: null, color: '#627eea', isActive: true, sortOrder: 2 },
    ];
    repo.findActive.mockResolvedValue(coins);

    const uc = new GetCoinsUseCase(repo);
    const result = await uc.execute();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('btc');
    expect(result[1].id).toBe('eth');
  });

  it('should return cached result on second call (in-process cache)', async () => {
    const repo = {
      findActive: jest.fn<Promise<CoinDTO[]>, []>(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findCandles: jest.fn(),
    } as jest.Mocked<ICoinRepository>;

    const coins: CoinDTO[] = [
      { id: 'btc', symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT', iconUrl: null, color: null, isActive: true, sortOrder: 0 },
    ];
    repo.findActive.mockResolvedValue(coins);

    const uc = new GetCoinsUseCase(repo);

    await uc.execute();
    await uc.execute();

    // Repository should only be called once (second call hits cache)
    expect(repo.findActive).toHaveBeenCalledTimes(1);
  });
});
