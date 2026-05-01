import {
  Controller,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  GetCurrentUserUseCase,
  UpdateUsernameUseCase,
  GetUserStatsUseCase,
} from '@pred/application';
import type { UserDTO, UserStatsDTO } from '@pred/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly updateUsername: UpdateUsernameUseCase,
    private readonly getUserStats: GetUserStatsUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getMe(@CurrentUser() user: AuthUser): Promise<UserDTO> {
    return this.getCurrentUser.execute({ userId: user.id });
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update display username' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  @ApiResponse({ status: 400, description: 'Invalid username format' })
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDTO> {
    try {
      return await this.updateUsername.execute({
        userId: user.id,
        username: dto.username,
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err) {
        const e = err as Error & { code: string; fields?: Record<string, string[]> };
        if (e.code === 'CONFLICT') {
          throw new HttpException(
            { type: 'https://pred.game/errors/conflict', title: e.message, status: 409, code: 'CONFLICT', fields: e.fields },
            409,
          );
        }
        if (e.code === 'INVALID_INPUT') {
          throw new HttpException(
            { type: 'https://pred.game/errors/invalid-input', title: e.message, status: 400, code: 'INVALID_INPUT', fields: e.fields },
            400,
          );
        }
      }
      throw err;
    }
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get current user stats' })
  @ApiResponse({ status: 200, description: 'User stats' })
  async getMyStats(@CurrentUser() user: AuthUser): Promise<UserStatsDTO> {
    return this.getUserStats.execute({ userId: user.id });
  }
}
