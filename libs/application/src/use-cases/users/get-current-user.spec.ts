import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { User, Money, TelegramUserId, ReferralCode } from '@pred/domain';
import type { IUserRepository, ICacheProvider } from '../../ports';

function createUser(id: string) {
  return new User(
    id,
    TelegramUserId.of(123n),
    { username: 'u', firstName: 'F', lastName: 'L', languageCode: 'en', isPremium: true, photoUrl: 'http://ph', allowsWriteToPm: false },
    'myuser',
    Money.fromPred(1500),
    { totalWins: 5, totalLosses: 3, bestWinStreak: 4, score: 100n },
    ReferralCode.parse('PRED_ABC111'),
    'ref-id',
    'user',
    'active',
    [],
    new Date('2025-01-01'),
    new Date('2025-01-02'),
    new Date('2025-01-02'),
  );
}

function mockDepositRepo() {
  return { countCompletedDepositsByUserId: jest.fn<Promise<number>, [string]>() };
}

describe('GetCurrentUserUseCase', () => {
  it('should return user from DB when cache miss', async () => {
    const userRepo = { findById: jest.fn<Promise<User | null>, [string]>() } as unknown as jest.Mocked<IUserRepository>;
    const depositRepo = mockDepositRepo();
    const cache = { get: jest.fn<Promise<unknown | null>, [string]>(), set: jest.fn() } as unknown as jest.Mocked<ICacheProvider>;
    const uc = new GetCurrentUserUseCase(userRepo as any, depositRepo as any, cache as any);

    const user = createUser('u1');
    cache.get.mockResolvedValue(null);
    userRepo.findById.mockResolvedValue(user);
    depositRepo.countCompletedDepositsByUserId.mockResolvedValue(0);

    const result = await uc.execute({ userId: 'u1' });

    expect(result.id).toBe('u1');
    expect(result.balance).toBe('1500.0000');
    expect(result.username).toBe('myuser');
    expect(result.isPremium).toBe(true);
    expect(result.isFirstDeposit).toBe(true);
    expect(cache.set).toHaveBeenCalledWith('user:u1:profile', expect.any(String), 300);
  });

  it('should return cached user when cache hit', async () => {
    const userRepo = { findById: jest.fn() } as unknown as jest.Mocked<IUserRepository>;
    const depositRepo = mockDepositRepo();
    const cache = { get: jest.fn<Promise<unknown | null>, [string]>(), set: jest.fn() } as unknown as jest.Mocked<ICacheProvider>;
    const uc = new GetCurrentUserUseCase(userRepo as any, depositRepo as any, cache as any);

    const cached = { id: 'u2', balance: '999.0000', username: 'cached', isFirstDeposit: false };
    cache.get.mockResolvedValue(cached);

    const result = await uc.execute({ userId: 'u2' });

    expect(result.id).toBe('u2');
    expect(result.balance).toBe('999.0000');
    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('should throw NOT_FOUND when user missing', async () => {
    const userRepo = { findById: jest.fn() } as unknown as jest.Mocked<IUserRepository>;
    const depositRepo = mockDepositRepo();
    const cache = { get: jest.fn() } as unknown as jest.Mocked<ICacheProvider>;
    const uc = new GetCurrentUserUseCase(userRepo as any, depositRepo as any, cache as any);

    cache.get.mockResolvedValue(null);
    userRepo.findById.mockResolvedValue(null);

    await expect(uc.execute({ userId: 'missing' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});