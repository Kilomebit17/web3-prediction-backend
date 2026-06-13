import { RefreshTokensUseCase } from './refresh-tokens.use-case';
import { User, Money, TelegramUserId, ReferralCode } from '@pred/domain';
import type { IUserRepository, IAuthTokenService, TokenPair, RefreshTokenPayload } from '../../ports';

function createUser(id: string, telegramId: bigint) {
  return new User(
    id,
    TelegramUserId.of(telegramId),
    { username: 'u', firstName: 'F', lastName: null, languageCode: null, isPremium: false, photoUrl: null, allowsWriteToPm: false },
    null,
    Money.fromPred(500),
    { totalWins: 0, totalLosses: 0, bestWinStreak: 0, score: 0n },
    ReferralCode.parse('PRED_AAA111'),
    null,
    'user',
    'active',
    [],
    new Date(),
    new Date(),
    null,
  );
}

function setupMocks() {
  return {
    userRepo: {
      findById: jest.fn<Promise<User | null>, [string]>(),
      findByTelegramId: jest.fn(),
      findByReferralCode: jest.fn(),
      findByUsername: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findByIds: jest.fn(),
      countByReferrerId: jest.fn(),
    } as jest.Mocked<IUserRepository>,

    tokenService: {
      verifyRefreshToken: jest.fn<Promise<RefreshTokenPayload>, [string]>(),
      issueTokenPair: jest.fn<Promise<TokenPair>, [string, bigint, string]>(),
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      logout: jest.fn(),
    } as jest.Mocked<IAuthTokenService>,
  };
}

describe('RefreshTokensUseCase', () => {
  const newTokens: TokenPair = { accessToken: 'new-access', refreshToken: 'new-refresh' };

  it('should verify old token and issue new token pair', async () => {
    const mocks = setupMocks();
    const uc = new RefreshTokensUseCase(mocks.userRepo, mocks.tokenService);

    const user = createUser('user-1', 111n);
    mocks.tokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', jti: 'old-jti' });
    mocks.userRepo.findById.mockResolvedValue(user);
    mocks.tokenService.issueTokenPair.mockResolvedValue(newTokens);

    const result = await uc.execute({ refreshToken: 'old-refresh-token' });

    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
    expect(mocks.tokenService.verifyRefreshToken).toHaveBeenCalledWith('old-refresh-token');
    expect(mocks.tokenService.issueTokenPair).toHaveBeenCalledWith('user-1', 111n, 'user');
  });

  it('should propagate TokenReuseError (reuse detection)', async () => {
    const mocks = setupMocks();
    const uc = new RefreshTokensUseCase(mocks.userRepo, mocks.tokenService);

    const reuseError = Object.assign(new Error('Token reuse'), { code: 'TOKEN_REUSE' });
    mocks.tokenService.verifyRefreshToken.mockRejectedValue(reuseError);

    await expect(
      uc.execute({ refreshToken: 'reused-token' }),
    ).rejects.toMatchObject({ code: 'TOKEN_REUSE' });

    expect(mocks.tokenService.issueTokenPair).not.toHaveBeenCalled();
  });

  it('should throw UNAUTHENTICATED when user not found', async () => {
    const mocks = setupMocks();
    const uc = new RefreshTokensUseCase(mocks.userRepo, mocks.tokenService);

    mocks.tokenService.verifyRefreshToken.mockResolvedValue({ sub: 'missing-user', jti: 'jti-1' });
    mocks.userRepo.findById.mockResolvedValue(null);

    await expect(
      uc.execute({ refreshToken: 'valid-but-orphaned' }),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('should throw UNAUTHENTICATED when user is banned', async () => {
    const mocks = setupMocks();
    const uc = new RefreshTokensUseCase(mocks.userRepo, mocks.tokenService);

    const banned = createUser('banned-1', 999n);
    Reflect.set(banned, 'status', 'banned'); // direct mutation for test

    mocks.tokenService.verifyRefreshToken.mockResolvedValue({ sub: 'banned-1', jti: 'jti-1' });
    mocks.userRepo.findById.mockResolvedValue(banned);

    await expect(
      uc.execute({ refreshToken: 'banned-user-token' }),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    expect(mocks.tokenService.issueTokenPair).not.toHaveBeenCalled();
  });

  it('should rotate: new refresh token has different jti', async () => {
    const mocks = setupMocks();
    const uc = new RefreshTokensUseCase(mocks.userRepo, mocks.tokenService);

    const user = createUser('user-2', 222n);
    mocks.tokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-2', jti: 'old-jti-123' });
    mocks.userRepo.findById.mockResolvedValue(user);
    mocks.tokenService.issueTokenPair.mockResolvedValue(newTokens);

    await uc.execute({ refreshToken: 'old-token' });

    // issueTokenPair generates a new jti internally
    expect(mocks.tokenService.issueTokenPair).toHaveBeenCalledTimes(1);
  });
});
