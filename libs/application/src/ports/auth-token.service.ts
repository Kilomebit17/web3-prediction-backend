import type { UserRole } from '@pred/domain';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  tgId: number;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface IAuthTokenService {
  signAccessToken(userId: string, telegramId: bigint, role: UserRole): Promise<string>;
  signRefreshToken(userId: string, jti?: string): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
  issueTokenPair(userId: string, telegramId: bigint, role: UserRole): Promise<TokenPair>;
  logout(jti: string, userId: string): Promise<void>;
  logoutAll(userId: string): Promise<void>;
}

export const AUTH_TOKEN_SERVICE = Symbol('IAuthTokenService');
