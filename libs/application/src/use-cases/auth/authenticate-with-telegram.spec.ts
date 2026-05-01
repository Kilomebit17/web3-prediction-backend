import { AuthenticateWithTelegramUseCase } from './authenticate-with-telegram.use-case';
import {
  User,
  Money,
  TelegramUserId,
  ReferralCode,
  UserRegistered,
  UserLoggedIn,
} from '@pred/domain';
import type {
  IUserRepository,
  IUnitOfWork,
  IEventBus,
  ITelegramVerifier,
  IAuthTokenService,
  ICacheProvider,
  ParsedTelegramInitData,
  TokenPair,
} from '../../ports';

const mockInitData: ParsedTelegramInitData = {
  authDate: new Date(),
  hash: 'abc123hash',
  user: {
    id: 123456789,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    languageCode: 'en',
    isPremium: false,
    allowsWriteToPm: true,
  },
};

const mockTokenPair: TokenPair = {
  accessToken: 'access-token-xxx',
  refreshToken: 'refresh-token-xxx',
};

function createUser(overrides?: Partial<{
  id: string;
  telegramId: bigint;
  status: string;
  referredById: string | null;
}>): User {
  return new User(
    overrides?.id ?? 'user-existing-id',
    TelegramUserId.of(overrides?.telegramId ?? 123456789n),
    {
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      languageCode: 'en',
      isPremium: false,
      photoUrl: null,
      allowsWriteToPm: true,
    },
    null,
    Money.fromPred(1000),
    { totalWins: 0, totalLosses: 0, bestWinStreak: 0, score: 0n },
    ReferralCode.parse('PRED_ABC123'),
    overrides?.referredById ?? null,
    'user',
    (overrides?.status as 'active' | 'banned') ?? 'active',
    [],
    new Date(),
    new Date(),
    new Date(),
  );
}

function setupMocks() {
  const txFn = jest.fn((work: () => Promise<unknown>) => work());

  return {
    userRepo: {
      findByTelegramId: jest.fn<Promise<User | null>, [bigint]>(),
      findByReferralCode: jest.fn<Promise<User | null>, [string]>(),
      create: jest.fn<Promise<void>, [User]>(),
      update: jest.fn<Promise<void>, [User]>(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      save: jest.fn(),
      findByIds: jest.fn(),
      findByReferrerId: jest.fn(),
      countByReferrerId: jest.fn(),
    } as jest.Mocked<IUserRepository>,

    uow: {
      withTransaction: jest.fn((work: () => Promise<unknown>) => txFn(work)),
    } as jest.Mocked<IUnitOfWork>,

    verifier: {
      verify: jest.fn<ReturnType<ITelegramVerifier['verify']>, Parameters<ITelegramVerifier['verify']>>(),
    } as jest.Mocked<ITelegramVerifier>,

    tokenService: {
      issueTokenPair: jest.fn<Promise<TokenPair>, [string, bigint, string]>(),
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
    } as jest.Mocked<IAuthTokenService>,

    eventBus: {
      publish: jest.fn<Promise<void>, [unknown]>(),
      publishAll: jest.fn(),
      subscribe: jest.fn(),
    } as jest.Mocked<IEventBus>,

    cache: {
      exists: jest.fn<Promise<boolean>, [string]>(),
      set: jest.fn<Promise<void>, [string, string, number?]>(),
      get: jest.fn(),
      del: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      lpush: jest.fn(),
      zadd: jest.fn(),
      zrange: jest.fn(),
      zrevrange: jest.fn(),
    } as jest.Mocked<ICacheProvider>,

    referralRepo: {
      create: jest.fn<Promise<void>, [{ referrerId: string; referredId: string }]>(),
      findByReferrerId: jest.fn(),
      addEarned: jest.fn(),
    },
  };
}

function createUseCase(mocks: ReturnType<typeof setupMocks>) {
  return new AuthenticateWithTelegramUseCase(
    mocks.userRepo,
    mocks.uow,
    mocks.eventBus,
    mocks.verifier,
    mocks.tokenService,
    mocks.cache,
    mocks.referralRepo,
  );
}

beforeEach(() => {
  process.env.INITIAL_BALANCE = '1000';
  process.env.TELEGRAM_ANTIREPLAY_ENABLED = 'true';
  process.env.TELEGRAM_AUTH_DATA_TTL = '86400';
});

describe('AuthenticateWithTelegramUseCase', () => {
  // ── TC1: Valid initData → new user ──────────────────────────────────────
  it('should create a new user with initial balance and referral code', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    mocks.verifier.verify.mockReturnValue(mockInitData);
    mocks.cache.exists.mockResolvedValue(false);
    mocks.userRepo.findByTelegramId.mockResolvedValue(null);
    mocks.userRepo.findByReferralCode.mockResolvedValue(null);
    mocks.tokenService.issueTokenPair.mockResolvedValue(mockTokenPair);

    const result = await uc.execute({ initDataRaw: 'valid_raw_data' });

    expect(result.isNewUser).toBe(true);
    expect(result.accessToken).toBe('access-token-xxx');
    expect(result.refreshToken).toBe('refresh-token-xxx');
    expect(result.user.balance).toBe('1000.0000');
    expect(result.user.status).toBe('active');
    expect(result.user.role).toBe('user');
    expect(result.user.telegramId).toBe('123456789');

    // User created with correct fields
    expect(mocks.userRepo.create).toHaveBeenCalledTimes(1);
    const createdUser: User = mocks.userRepo.create.mock.calls[0][0];
    expect(createdUser.telegramId.value).toBe(123456789n);
    expect(createdUser.balance.toString()).toBe('1000.0000');
    expect(createdUser.referralCode.value).toMatch(/^PRED_[A-Z0-9]{6}$/);
    expect(createdUser.status).toBe('active');

    // Event emitted
    expect(mocks.eventBus.publish).toHaveBeenCalledWith(
      expect.any(UserRegistered),
    );

    // Anti-replay set
    expect(mocks.cache.set).toHaveBeenCalledWith(
      'tma:used_hash:abc123hash',
      '1',
      86400,
    );
  });

  // ── TC2: Valid initData + existing user ─────────────────────────────────
  it('should update existing user profile and not change referredById', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    const existingUser = createUser({ referredById: 'referrer-123' });

    mocks.verifier.verify.mockReturnValue(mockInitData);
    mocks.cache.exists.mockResolvedValue(false);
    mocks.userRepo.findByTelegramId.mockResolvedValue(existingUser);
    mocks.tokenService.issueTokenPair.mockResolvedValue(mockTokenPair);

    const result = await uc.execute({ initDataRaw: 'valid_raw_data' });

    expect(result.isNewUser).toBe(false);
    expect(result.user.referredById).toBe('referrer-123');

    // User updated, not created
    expect(mocks.userRepo.update).toHaveBeenCalledTimes(1);
    expect(mocks.userRepo.create).not.toHaveBeenCalled();

    // Event emitted
    expect(mocks.eventBus.publish).toHaveBeenCalledWith(
      expect.any(UserLoggedIn),
    );
  });

  // ── TC3: Tampered hash → INVALID_SIGNATURE ─────────────────────────────
  it('should throw INVALID_SIGNATURE when verification fails', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    const error = Object.assign(
      new Error('Signature mismatch'),
      { code: 'INVALID_SIGNATURE' },
    );
    mocks.verifier.verify.mockImplementation(() => {
      throw error;
    });

    await expect(
      uc.execute({ initDataRaw: 'tampered_data' }),
    ).rejects.toMatchObject({ code: 'INVALID_SIGNATURE' });

    expect(mocks.userRepo.create).not.toHaveBeenCalled();
  });

  // ── TC4: auth_date expired → AUTH_DATA_EXPIRED ─────────────────────────
  it('should throw AUTH_DATA_EXPIRED when initData is too old', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    const error = Object.assign(
      new Error('Init data expired'),
      { code: 'AUTH_DATA_EXPIRED' },
    );
    mocks.verifier.verify.mockImplementation(() => {
      throw error;
    });

    await expect(
      uc.execute({ initDataRaw: 'expired_data' }),
    ).rejects.toMatchObject({ code: 'AUTH_DATA_EXPIRED' });

    expect(mocks.userRepo.create).not.toHaveBeenCalled();
  });

  // ── TC5: Replay with same hash → rejected ──────────────────────────────
  it('should reject replay of the same initData hash', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    mocks.verifier.verify.mockReturnValue(mockInitData);
    mocks.cache.exists.mockResolvedValue(true); // hash already used

    await expect(
      uc.execute({ initDataRaw: 'replay_data' }),
    ).rejects.toMatchObject({ code: 'AUTH_DATA_EXPIRED' });

    expect(mocks.userRepo.create).not.toHaveBeenCalled();
    expect(mocks.userRepo.update).not.toHaveBeenCalled();
  });

  // ── TC6: start_param with ref code on new user → referredById set ──────
  it('should set referredById from start_param on new user', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    const initDataWithRef: ParsedTelegramInitData = {
      ...mockInitData,
      startParam: 'ref_PRED_XYZ789',
    };

    const referrer = createUser({ id: 'referrer-uuid', telegramId: 999n });

    mocks.verifier.verify.mockReturnValue(initDataWithRef);
    mocks.cache.exists.mockResolvedValue(false);
    mocks.userRepo.findByTelegramId.mockResolvedValue(null);
    mocks.userRepo.findByReferralCode.mockImplementation(async (code: string) => {
      if (code === 'PRED_XYZ789') return referrer;
      return null; // for uniqueness checks
    });
    mocks.tokenService.issueTokenPair.mockResolvedValue(mockTokenPair);

    const result = await uc.execute({ initDataRaw: 'ref_data' });

    expect(result.isNewUser).toBe(true);

    const createdUser: User = mocks.userRepo.create.mock.calls[0][0];
    expect(createdUser.referredById).toBe('referrer-uuid');
  });

  // ── TC7: start_param on existing user → referredById unchanged ─────────
  it('should not change referredById on existing user', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    const existingUser = createUser({ referredById: 'original-referrer' });

    const initDataWithRef: ParsedTelegramInitData = {
      ...mockInitData,
      startParam: 'ref_PRED_NEWREF',
    };

    const anotherReferrer = createUser({ id: 'another-referrer', telegramId: 888n });

    mocks.verifier.verify.mockReturnValue(initDataWithRef);
    mocks.cache.exists.mockResolvedValue(false);
    mocks.userRepo.findByTelegramId.mockResolvedValue(existingUser);
    mocks.userRepo.findByReferralCode.mockResolvedValue(anotherReferrer);
    mocks.tokenService.issueTokenPair.mockResolvedValue(mockTokenPair);

    const result = await uc.execute({ initDataRaw: 'existing_with_ref' });

    expect(result.isNewUser).toBe(false);
    expect(result.user.referredById).toBe('original-referrer');
    expect(mocks.userRepo.create).not.toHaveBeenCalled();
  });

  // ── TC8: Banned user → USER_BANNED ─────────────────────────────────────
  it('should throw USER_BANNED when user is banned', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    const bannedUser = createUser({ status: 'banned' });

    mocks.verifier.verify.mockReturnValue(mockInitData);
    mocks.cache.exists.mockResolvedValue(false);
    mocks.userRepo.findByTelegramId.mockResolvedValue(bannedUser);

    await expect(
      uc.execute({ initDataRaw: 'banned_user_data' }),
    ).rejects.toMatchObject({ code: 'USER_BANNED' });

    expect(mocks.tokenService.issueTokenPair).not.toHaveBeenCalled();
  });

  // ── Edge: anti-replay disabled ──────────────────────────────────────────
  it('should skip anti-replay when disabled', async () => {
    process.env.TELEGRAM_ANTIREPLAY_ENABLED = 'false';
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    mocks.verifier.verify.mockReturnValue(mockInitData);
    mocks.userRepo.findByTelegramId.mockResolvedValue(null);
    mocks.userRepo.findByReferralCode.mockResolvedValue(null);
    mocks.tokenService.issueTokenPair.mockResolvedValue(mockTokenPair);

    await uc.execute({ initDataRaw: 'no_replay_check' });

    // Anti-replay key should NOT be checked or set
    expect(mocks.cache.exists).not.toHaveBeenCalled();
    expect(mocks.cache.set).not.toHaveBeenCalled();
  });

  // ── Edge: start_param without ref_ prefix is ignored ────────────────────
  it('should ignore start_param without ref_ prefix', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    const initDataNoRef: ParsedTelegramInitData = {
      ...mockInitData,
      startParam: 'some_other_param',
    };

    mocks.verifier.verify.mockReturnValue(initDataNoRef);
    mocks.cache.exists.mockResolvedValue(false);
    mocks.userRepo.findByTelegramId.mockResolvedValue(null);
    mocks.userRepo.findByReferralCode.mockResolvedValue(null);
    mocks.tokenService.issueTokenPair.mockResolvedValue(mockTokenPair);

    await uc.execute({ initDataRaw: 'no_ref' });

    const createdUser: User = mocks.userRepo.create.mock.calls[0][0];
    expect(createdUser.referredById).toBeNull();
    // findReferralCode is called only during uniqueness check, not for referrer resolution
    const refCalls = mocks.userRepo.findByReferralCode.mock.calls
      .map(([code]) => code as string)
      .filter((c) => c === 'PRED_NONEXIST' || c.startsWith('PRED_'));
    // All calls should be for uniqueness checks (generated codes), not PRED_NONEXIST
    expect(refCalls.filter((c) => c === 'PRED_NONEXIST').length).toBe(0);
  });

  // ── Edge: referral code not found ───────────────────────────────────────
  it('should leave referredById null when referral code not found', async () => {
    const mocks = setupMocks();
    const uc = createUseCase(mocks);

    const initDataWithRef: ParsedTelegramInitData = {
      ...mockInitData,
      startParam: 'ref_PRED_NONEXIST',
    };

    mocks.verifier.verify.mockReturnValue(initDataWithRef);
    mocks.cache.exists.mockResolvedValue(false);
    mocks.userRepo.findByTelegramId.mockResolvedValue(null);
    mocks.userRepo.findByReferralCode.mockResolvedValue(null); // code not found
    mocks.tokenService.issueTokenPair.mockResolvedValue(mockTokenPair);

    await uc.execute({ initDataRaw: 'bad_ref' });

    const createdUser: User = mocks.userRepo.create.mock.calls[0][0];
    expect(createdUser.referredById).toBeNull();
  });
});
