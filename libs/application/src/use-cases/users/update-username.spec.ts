import { UpdateUsernameUseCase } from './update-username.use-case';
import { User, Money, TelegramUserId, ReferralCode } from '@pred/domain';
import type { IUserRepository, ICacheProvider } from '../../ports';

function createUser(id: string, username: string | null = null) {
  return new User(
    id,
    TelegramUserId.of(123n),
    { username: 'u', firstName: 'F', lastName: null, languageCode: null, isPremium: false, photoUrl: null, allowsWriteToPm: false },
    username,
    Money.fromPred(1000),
    { totalWins: 0, totalLosses: 0, bestWinStreak: 0, score: 0n },
    ReferralCode.parse('PRED_TST001'),
    null,
    'user',
    'active',
    [],
    new Date(),
    new Date(),
    null,
  );
}

describe('UpdateUsernameUseCase', () => {
  it('should update username and invalidate cache', async () => {
    const userRepo = {
      findByUsername: jest.fn<Promise<User | null>, [string]>(),
      findById: jest.fn<Promise<User | null>, [string]>(),
      update: jest.fn<Promise<void>, [User]>(),
    } as unknown as jest.Mocked<IUserRepository>;
    const cache = { del: jest.fn() } as unknown as jest.Mocked<ICacheProvider>;
    const uc = new UpdateUsernameUseCase(userRepo, cache);

    const user = createUser('u1', null);
    userRepo.findByUsername.mockResolvedValue(null);
    userRepo.findById.mockResolvedValue(user);

    const result = await uc.execute({ userId: 'u1', username: 'new_name' });

    expect(result.username).toBe('new_name');
    expect(userRepo.update).toHaveBeenCalled();
    expect(cache.del).toHaveBeenCalledWith('user:u1:profile');
  });

  it('should throw CONFLICT when username taken', async () => {
    const userRepo = {
      findByUsername: jest.fn<Promise<User | null>, [string]>(),
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;
    const cache = { del: jest.fn() } as unknown as jest.Mocked<ICacheProvider>;
    const uc = new UpdateUsernameUseCase(userRepo, cache);

    const anotherUser = createUser('other', 'taken_name');
    userRepo.findByUsername.mockResolvedValue(anotherUser);

    await expect(
      uc.execute({ userId: 'u1', username: 'taken_name' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('should allow same user to keep their own username (no conflict)', async () => {
    const userRepo = {
      findByUsername: jest.fn<Promise<User | null>, [string]>(),
      findById: jest.fn<Promise<User | null>, [string]>(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;
    const cache = { del: jest.fn() } as unknown as jest.Mocked<ICacheProvider>;
    const uc = new UpdateUsernameUseCase(userRepo, cache);

    const user = createUser('u1', 'my_name');
    userRepo.findByUsername.mockResolvedValue(user); // same user
    userRepo.findById.mockResolvedValue(user);

    // Re-setting same username should work (no conflict since same user)
    const result = await uc.execute({ userId: 'u1', username: 'my_name' });
    expect(result.username).toBe('my_name');
  });

  it('should throw INVALID_INPUT for bad format', async () => {
    const userRepo = { findByUsername: jest.fn() } as unknown as jest.Mocked<IUserRepository>;
    const cache = { del: jest.fn() } as unknown as jest.Mocked<ICacheProvider>;
    const uc = new UpdateUsernameUseCase(userRepo, cache);

    await expect(uc.execute({ userId: 'u1', username: 'ab' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(uc.execute({ userId: 'u1', username: 'a'.repeat(33) })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(uc.execute({ userId: 'u1', username: 'bad@chars' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
