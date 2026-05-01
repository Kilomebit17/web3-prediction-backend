import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { GetLeaderboardUseCase, type LeaderboardEntry } from '@pred/application';
import { RankEventHandler } from '../users/rank.handler';

@ApiTags('Leaderboard')
@Controller({ path: 'leaderboard', version: '1' })
export class LeaderboardController {
  constructor(private readonly getLeaderboard: GetLeaderboardUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Get top leaderboard' })
  async top(
    @Query('period') period = 'all',
    @Query('limit') limit = '100',
  ): Promise<LeaderboardEntry[]> {
    return this.getLeaderboard.execute(period, Math.min(100, parseInt(limit, 10) || 100));
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my position with neighbors' })
  async me(
    @CurrentUser() user: AuthUser,
    @Query('period') period = 'all',
  ): Promise<{ entry: LeaderboardEntry | null; neighbors: LeaderboardEntry[] }> {
    return this.getLeaderboard.getUserPosition(user.id, period);
  }

  @Get('ranks')
  @ApiOperation({ summary: 'List all ranks' })
  async ranks(): Promise<unknown[]> {
    return RankEventHandler.getRanks();
  }
}
