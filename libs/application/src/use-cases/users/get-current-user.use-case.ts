import { Injectable, Inject } from '@nestjs/common';
import { User } from '@pred/domain';
import type { UserDTO } from '@pred/shared';
import {
  USER_REPOSITORY,
  CACHE_PROVIDER,
  type IUserRepository,
  type ICacheProvider,
} from '../../ports';

export interface GetCurrentUserInput {
  userId: string;
}

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async execute(input: GetCurrentUserInput): Promise<UserDTO> {
    const cacheKey = `user:${input.userId}:profile`;

    // Read-through cache (ROADMAP §5.2)
    const cached = await this.cache.get<UserDTO>(cacheKey);
    if (cached) return cached;

    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
    }

    const dto = this.toDto(user);
    await this.cache.set(cacheKey, JSON.stringify(dto), 300); // TTL 5m
    return dto;
  }

  private toDto(user: User): UserDTO {
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
    };
  }
}
