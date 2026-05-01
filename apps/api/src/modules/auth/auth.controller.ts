import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  AuthenticateWithTelegramUseCase,
  type AuthenticateWithTelegramOutput,
  RefreshTokensUseCase,
  LogoutUseCase,
  LogoutAllUseCase,
} from '@pred/application';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { TelegramAuthDto, TelegramAuthResponseDto } from './dto/telegram-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authenticateUseCase: AuthenticateWithTelegramUseCase,
    private readonly refreshTokensUseCase: RefreshTokensUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
  ) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate via Telegram Mini App initData' })
  @ApiResponse({
    status: 200,
    description: 'Tokens + user profile',
    type: TelegramAuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid signature or expired initData' })
  @ApiResponse({ status: 403, description: 'User is banned' })
  async telegramAuth(
    @Body() dto: TelegramAuthDto,
  ): Promise<AuthenticateWithTelegramOutput> {
    try {
      return await this.authenticateUseCase.execute({
        initDataRaw: dto.initDataRaw,
      });
    } catch (err: unknown) {
      throw this.mapAuthError(err);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token (rotation + reuse detection)' })
  @ApiResponse({ status: 200, description: 'New token pair' })
  @ApiResponse({ status: 401, description: 'Invalid or reused refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      return await this.refreshTokensUseCase.execute({
        refreshToken: dto.refreshToken,
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err) {
        const code = (err as Error & { code: string }).code;
        if (code === 'TOKEN_REUSE') {
          throw new HttpException(
            {
              type: 'https://pred.game/errors/unauthenticated',
              title: 'Refresh token reuse detected — all sessions invalidated. Please re-authenticate.',
              status: 401,
              code: 'TOKEN_REUSE',
            },
            401,
          );
        }
      }
      throw new HttpException(
        {
          type: 'https://pred.game/errors/unauthenticated',
          title: 'Invalid or expired refresh token',
          status: 401,
          code: 'UNAUTHENTICATED',
        },
        401,
      );
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout current session (revoke refresh token)' })
  @ApiResponse({ status: 204, description: 'Session terminated' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.logoutUseCase.execute({ refreshToken: dto.refreshToken });
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout all sessions for current user' })
  @ApiResponse({ status: 204, description: 'All sessions terminated' })
  @ApiResponse({ status: 401, description: 'UNAUTHENTICATED' })
  async logoutAll(@CurrentUser() user: AuthUser): Promise<void> {
    await this.logoutAllUseCase.execute({ userId: user.id });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private mapAuthError(err: unknown): HttpException {
    if (err instanceof Error && 'code' in err) {
      const code = (err as Error & { code: string }).code;
      switch (code) {
        case 'INVALID_SIGNATURE':
          return new HttpException(
            { type: 'https://pred.game/errors/invalid-signature', title: err.message, status: 401, code: 'INVALID_SIGNATURE' },
            401,
          );
        case 'AUTH_DATA_EXPIRED':
          return new HttpException(
            { type: 'https://pred.game/errors/auth-data-expired', title: err.message, status: 401, code: 'AUTH_DATA_EXPIRED' },
            401,
          );
        case 'USER_BANNED':
          return new HttpException(
            { type: 'https://pred.game/errors/user-banned', title: err.message, status: 403, code: 'USER_BANNED' },
            403,
          );
      }
    }
    throw err;
  }
}
