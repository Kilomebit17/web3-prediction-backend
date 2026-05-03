import { Injectable, Inject } from '@nestjs/common';
import type { UserDTO } from '@pred/shared';
import {
  USER_REPOSITORY,
  CACHE_PROVIDER,
  type IUserRepository,
  type ICacheProvider,
} from '../../ports';

export interface UpdateUsernameInput {
  userId: string;
  username: string;
}

@Injectable()
export class UpdateUsernameUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async execute(input: UpdateUsernameInput): Promise<UserDTO> {
    // Validate format (ROADMAP §6.3)
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(input.username)) {
      throw Object.assign(
        new Error('Username must be 3-32 alphanumeric characters'),
        { code: 'INVALID_INPUT', fields: { username: ['Invalid format'] } },
      );
    }

    // Check uniqueness
    const existing = await this.userRepo.findByUsername(input.username);
    if (existing && existing.id !== input.userId) {
      throw Object.assign(new Error('Username already taken'), {
        code: 'CONFLICT',
        fields: { username: ['Already taken'] },
      });
    }

    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
    }

    const oldUsername = user.username;
    user.changeUsername(input.username);
    await this.userRepo.update(user);

    // Update leaderboard entry (member string includes username)
    const rankId = await this.cache.get<string>(`user:${input.userId}:rank`);
    if (rankId) {
      const oldMember = `${user.id}:${oldUsername ?? ''}:${user.stats.score}:${user.balance.toString()}`;
      const newMember = `${user.id}:${user.username}:${user.stats.score}:${user.balance.toString()}`;
      await this.cache.zrem(`leaderboard:${rankId}:score`, oldMember);
      await this.cache.zadd(`leaderboard:${rankId}:score`, Number(user.stats.score), newMember);
    }

    // Invalidate cache
    await this.cache.del(`user:${input.userId}:profile`);

    return {
      id: user.id,
      telegramId: user.telegramId.value.toString(),
      telegramUsername: user.telegramProfile.username,
      firstName: user.telegramProfile.firstName,
      lastName: user.telegramProfile.lastName,
      languageCode: user.telegramProfile.languageCode,
      isPremium: user.telegramProfile.isPremium,
      photoUrl: user.telegramProfile.photoUrl,
      username: user.username,
      balance: user.balance.toString(),
      totalWins: user.stats.totalWins,
      totalLosses: user.stats.totalLosses,
      bestWinStreak: user.stats.bestWinStreak,
      score: user.stats.score.toString(),
      referralCode: user.referralCode.value,
      referredById: user.referredById,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      isFirstDeposit: false,
    };
  }
}
