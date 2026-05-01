import { LogoutUseCase } from './logout.use-case';
import { LogoutAllUseCase } from './logout-all.use-case';
import type { IAuthTokenService, RefreshTokenPayload } from '../../ports';

function setupMocks() {
  return {
    tokenService: {
      verifyRefreshToken: jest.fn<Promise<RefreshTokenPayload>, [string]>(),
      logoutAll: jest.fn<Promise<void>, [string]>(),
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      issueTokenPair: jest.fn(),
      logout: jest.fn(),
    } as jest.Mocked<IAuthTokenService>,
  };
}

describe('LogoutUseCase', () => {
  it('should verify refresh token to revoke it (implicit deletion)', async () => {
    const mocks = setupMocks();
    const uc = new LogoutUseCase(mocks.tokenService);

    mocks.tokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', jti: 'jti-1' });

    await uc.execute({ refreshToken: 'token-to-revoke' });

    expect(mocks.tokenService.verifyRefreshToken).toHaveBeenCalledWith('token-to-revoke');
  });

  it('should succeed if token is already expired (idempotent)', async () => {
    const mocks = setupMocks();
    const uc = new LogoutUseCase(mocks.tokenService);

    mocks.tokenService.verifyRefreshToken.mockRejectedValue(new Error('Token expired'));

    // Should not throw — logout is idempotent
    await expect(
      uc.execute({ refreshToken: 'already-expired' }),
    ).resolves.toBeUndefined();
  });

  it('should succeed if token reuse detected (already invalidated)', async () => {
    const mocks = setupMocks();
    const uc = new LogoutUseCase(mocks.tokenService);

    const reuseError = Object.assign(new Error('Token reuse'), { code: 'TOKEN_REUSE' });
    mocks.tokenService.verifyRefreshToken.mockRejectedValue(reuseError);

    await expect(
      uc.execute({ refreshToken: 'reused-token' }),
    ).resolves.toBeUndefined();
  });
});

describe('LogoutAllUseCase', () => {
  it('should invalidate all user sessions', async () => {
    const mocks = setupMocks();
    const uc = new LogoutAllUseCase(mocks.tokenService);

    await uc.execute({ userId: 'user-1' });

    expect(mocks.tokenService.logoutAll).toHaveBeenCalledWith('user-1');
  });
});
