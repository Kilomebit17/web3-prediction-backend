import { GetUserStatsUseCase } from './get-user-stats.use-case';
import { User, Money, TelegramUserId, ReferralCode } from '@pred/domain';
import type { IUserRepository } from '../../ports';

function createUser() {
  return new User(
    'u1',
    TelegramUserId.of(123n),
    { username: 'u', firstName: 'F', lastName: null, languageCode: null, isPremium: false, photoUrl: null, allowsWriteToPm: false },
    null,
    Money.fromPred(2000),
    { totalWins: 10, totalLosses: 4, bestWinStreak: 7, score: 500n },
    ReferralCode.parse('PRED_STS001'),
    null,
    'user',
    'active',
    [],
    new Date(),
    new Date(),
    null,
  );
}

describe('GetUserStatsUseCase', () => {
  it('should return user stats DTO', async () => {
    const userRepo = { findById: jest.fn<Promise<User | null>, [string]>() } as unknown as jest.Mocked<IUserRepository>;
    const uc = new GetUserStatsUseCase(userRepo);

    userRepo.findById.mockResolvedValue(createUser());

    const result = await uc.execute({ userId: 'u1' });

    expect(result.totalWins).toBe(10);
    expect(result.totalLosses).toBe(4);
    expect(result.bestWinStreak).toBe(7);
    expect(result.score).toBe('500');
    expect(result.balance).toBe('2000.0000');
    expect(result.totalBets).toBe(14);
  });

  it('should throw NOT_FOUND when user missing', async () => {
    const userRepo = { findById: jest.fn() } as unknown as jest.Mocked<IUserRepository>;
    const uc = new GetUserStatsUseCase(userRepo);

    userRepo.findById.mockResolvedValue(null);

    await expect(uc.execute({ userId: 'missing' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
