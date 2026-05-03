import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { GetLeaderboardUseCase, type LeaderboardEntry, type LeaderboardPage } from '@pred/application';

@ApiTags('Leaderboard')
@Controller({ path: 'leaderboard', version: '1' })
export class LeaderboardController {
  constructor(private readonly getLeaderboard: GetLeaderboardUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Get leaderboard by category with pagination' })
  async page(
    @Query('category') category = 'j1',
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<LeaderboardPage> {
    return this.getLeaderboard.getPage(category, Math.max(1, parseInt(page, 10) || 1), Math.min(100, parseInt(pageSize, 10) || 20));
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my position with neighbors' })
  async me(
    @CurrentUser() user: AuthUser,
  ): Promise<{ entry: LeaderboardEntry | null; rankId: string; neighbors: LeaderboardEntry[] } | null> {
    return this.getLeaderboard.getUserPosition(user.id);
  }

  @Get('ranks')
  @ApiOperation({ summary: 'List all ranks' })
  async ranks(): Promise<{ id: string; name: string; minBalance: string; tierOrder: number }[]> {
    return GetLeaderboardUseCase.getRanks();
  }
}