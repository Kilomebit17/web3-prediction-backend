import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { readFile } from 'fs/promises';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { CACHE_PROVIDER, type ICacheProvider, type IAuthTokenService } from '@pred/application';
import type { UserRole } from '@pred/domain';

export interface AccessTokenPayload {
  sub: string;
  tgId: number;
  role: UserRole;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class TokenReuseError extends Error {
  public readonly code = 'TOKEN_REUSE';
  constructor() {
    super('Refresh token reuse detected — all sessions invalidated');
    this.name = 'TokenReuseError';
  }
}

@Injectable()
export class JwtService implements OnModuleInit, IAuthTokenService {
  private privateKey = '';
  private publicKey = '';

  private accessTTL: number;
  private refreshTTL: number;
  private issuer: string;
  private audience: string;

  constructor(@Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider) {
    this.accessTTL = parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10);
    this.refreshTTL = parseInt(process.env.JWT_REFRESH_TTL ?? '2592000', 10);
    this.issuer = process.env.JWT_ISSUER ?? 'pred.game';
    this.audience = process.env.JWT_AUDIENCE ?? 'pred.game.api';
  }

  async onModuleInit(): Promise<void> {
    // Prefer raw keys from env vars (Railway-compatible, base64-encoded)
    if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
      this.privateKey = Buffer.from(process.env.JWT_PRIVATE_KEY, 'base64').toString('utf-8');
      this.publicKey = Buffer.from(process.env.JWT_PUBLIC_KEY, 'base64').toString('utf-8');
      return;
    }

    // Fallback: read from file paths (local dev / Docker with mounted volumes)
    const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH ?? './secrets/jwt.private.pem';
    const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH ?? './secrets/jwt.public.pem';

    try {
      this.privateKey = await readFile(privateKeyPath, 'utf-8');
      this.publicKey = await readFile(publicKeyPath, 'utf-8');
    } catch {
      // Development fallback: generate ephemeral keys
      const { generateKeyPairSync } = await import('crypto');
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }
  }

  async issueTokenPair(
    userId: string,
    telegramId: bigint,
    role: UserRole,
  ): Promise<TokenPair> {
    const accessToken = await this.signAccessToken(userId, telegramId, role);
    const refreshToken = await this.signRefreshToken(userId);
    return { accessToken, refreshToken };
  }

  async signAccessToken(userId: string, telegramId: bigint, role: UserRole): Promise<string> {
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      tgId: Number(telegramId),
      role,
      iss: this.issuer,
      aud: this.audience,
    };
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessTTL,
    });
  }

  async signRefreshToken(userId: string, jti?: string): Promise<string> {
    const tokenJti = jti ?? randomUUID();
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      jti: tokenJti,
    };
    const token = jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.refreshTTL,
    });

    // Redis allow-list
    await this.cache.sadd(`session:${userId}`, tokenJti);
    await this.cache.set(`refresh_token:${tokenJti}`, userId, this.refreshTTL);

    return token;
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const payload = jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      issuer: this.issuer,
      audience: this.audience,
    }) as unknown as AccessTokenPayload;
    return payload;
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const payload = jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as unknown as RefreshTokenPayload;

    // Check allow-list (reuse detection)
    const exists = await this.cache.exists(`refresh_token:${payload.jti}`);
    if (!exists) {
      // Token reuse detected — invalidate all user sessions
      await this.invalidateAllSessions(payload.sub);
      throw new TokenReuseError();
    }

    // Rotation: delete the used token
    await this.cache.del(`refresh_token:${payload.jti}`);
    await this.cache.srem(`session:${payload.sub}`, payload.jti);

    return payload;
  }

  async logout(jti: string, userId: string): Promise<void> {
    await this.cache.del(`refresh_token:${jti}`);
    await this.cache.srem(`session:${userId}`, jti);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.invalidateAllSessions(userId);
  }

  private async invalidateAllSessions(userId: string): Promise<void> {
    const jtis = await this.cache.smembers(`session:${userId}`);
    for (const jti of jtis) {
      await this.cache.del(`refresh_token:${jti}`);
    }
    await this.cache.del(`session:${userId}`);
  }
}
