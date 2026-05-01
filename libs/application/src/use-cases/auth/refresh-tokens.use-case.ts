import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  AUTH_TOKEN_SERVICE,
  type IUserRepository,
  type IAuthTokenService,
  type TokenPair,
} from '../../ports';

export interface RefreshTokensInput {
  refreshToken: string;
}

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokenService: IAuthTokenService,
  ) {}

  async execute(input: RefreshTokensInput): Promise<TokenPair> {
    // 1. Verify old refresh token (this removes it from allow-list / detects reuse)
    //    On reuse: TokenReuseError is thrown → all sessions invalidated
    const payload = await this.tokenService.verifyRefreshToken(input.refreshToken);

    // 2. Look up user for telegramId + role (needed for new access token)
    const user = await this.userRepo.findById(payload.sub);
    if (!user || user.status === 'banned') {
      throw Object.assign(new Error('User not found or banned'), {
        code: 'UNAUTHENTICATED',
      });
    }

    // 3. Issue new token pair (new access + new refresh with new jti)
    return this.tokenService.issueTokenPair(
      user.id,
      user.telegramId.value,
      user.role,
    );
  }
}
