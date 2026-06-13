import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, type IUserRepository } from '../../ports';

export interface GetReferralInfoInput {
  userId: string;
}

@Injectable()
export class GetReferralInfoUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: GetReferralInfoInput): Promise<{
    code: string; deepLink: string; inviteesCount: number; totalEarned: string;
  }> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'pred_bot';
    const count = await this.userRepo.countByReferrerId(input.userId);

    return {
      code: user.referralCode.value,
      deepLink: `https://t.me/${botUsername}?start=ref_${user.referralCode.value}`,
      inviteesCount: count,
      totalEarned: '0',
    };
  }
}
