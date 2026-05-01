import { Injectable, Inject } from '@nestjs/common';
import type { UserStatsDTO } from '@pred/shared';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../ports';

export interface GetUserStatsInput {
  userId: string;
}

@Injectable()
export class GetUserStatsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: GetUserStatsInput): Promise<UserStatsDTO> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
    }

    return {
      totalWins: user.stats.totalWins,
      totalLosses: user.stats.totalLosses,
      bestWinStreak: user.stats.bestWinStreak,
      score: user.stats.score.toString(),
      balance: user.balance.toString(),
      totalBets: user.stats.totalWins + user.stats.totalLosses,
    };
  }
}
