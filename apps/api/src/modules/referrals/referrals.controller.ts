import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { GetReferralInfoUseCase } from '@pred/application';

@ApiTags('Referrals')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'referrals', version: '1' })
export class ReferralsController {
  constructor(private readonly getReferralInfo: GetReferralInfoUseCase) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my referral info' })
  async getMe(@CurrentUser() user: AuthUser): Promise<{
    code: string; deepLink: string; inviteesCount: number; totalEarned: string;
  }> {
    return this.getReferralInfo.execute({ userId: user.id });
  }

  @Get('me/invitees')
  @ApiOperation({ summary: 'List my invitees' })
  async getInvitees(
    @CurrentUser() user: AuthUser,
    @Query('cursor') _cursor?: string,
  ): Promise<{ data: Array<{ userId: string; username: string | null; joinedAt: string; totalBets: number }>; meta: { nextCursor: string | null } }> {
    return this.getReferralInfo.getInvitees({ userId: user.id, cursor: _cursor });
  }
}
