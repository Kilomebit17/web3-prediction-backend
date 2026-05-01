import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus, UseGuards, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { AdminUsersUseCase } from '@pred/application';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly adminUsers: AdminUsersUseCase,
  ) {}

  @Get('users')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Search users' })
  async listUsers(@Query('query') query?: string, @Query('cursor') _cursor?: string): Promise<{ data: unknown[] }> {
    const users = await this.adminUsers.listUsers(query);
    return { data: users };
  }

  @Post('users/:id/adjust-balance')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust user balance (+/-)' })
  async adjustBalance(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() body: { delta: string; reason: string },
  ): Promise<unknown> {
    try {
      return await this.adminUsers.adjustBalance({
        adminUserId: admin.id, targetUserId: id, delta: body.delta, reason: body.reason,
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as Error & { code: string }).code === 'NOT_FOUND') {
        throw new HttpException({ type: 'https://pred.game/errors/not-found', title: err.message, status: 404, code: 'NOT_FOUND' }, 404);
      }
      if (err instanceof Error && (err.message.includes('balance') || err.message.includes('Insufficient'))) {
        throw new HttpException({ type: 'https://pred.game/errors/insufficient-balance', title: err.message, status: 422, code: 'INSUFFICIENT_BALANCE' }, 422);
      }
      throw err;
    }
  }

  @Post('users/:id/ban')
  @Roles('admin', 'moderator')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ban user' })
  async ban(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<void> {
    await this.adminUsers.banUser({ adminUserId: admin.id, targetUserId: id, reason: body.reason });
  }

  @Post('users/:id/unban')
  @Roles('admin', 'moderator')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unban user' })
  async unban(@Param('id') id: string): Promise<void> {
    await this.adminUsers.unbanUser({ targetUserId: id });
  }

  @Get('metrics/overview')
  @Roles('admin')
  @ApiOperation({ summary: 'KPI dashboard' })
  async metrics(): Promise<Record<string, unknown>> {
    return { totalUsers: 0, totalBetsPlaced: 0, totalVolume: '0', activeUsers24h: 0 };
  }
}
