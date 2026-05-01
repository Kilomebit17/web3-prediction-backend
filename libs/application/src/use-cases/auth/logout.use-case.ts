import { Injectable, Inject } from '@nestjs/common';
import {
  AUTH_TOKEN_SERVICE,
  type IAuthTokenService,
} from '../../ports';

export interface LogoutInput {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokenService: IAuthTokenService,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    // Verify removes the token from allow-list (rotation step).
    // We intentionally do NOT re-issue — this terminates the session.
    try {
      await this.tokenService.verifyRefreshToken(input.refreshToken);
    } catch (err: unknown) {
      // Token already revoked / invalid — still success (idempotent logout)
      if (err instanceof Error && 'code' in err && (err as Error & { code: string }).code === 'TOKEN_REUSE') {
        // Reuse detected — sessions already invalidated, still OK
        return;
      }
      // Other errors (expired, malformed) — still OK, token is useless
      return;
    }
  }
}
