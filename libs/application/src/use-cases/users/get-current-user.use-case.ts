import { Injectable, Inject } from '@nestjs/common';
import { User } from '@pred/domain';
import type { UserDTO } from '@pred/shared';
import { USER_REPOSITORY, type IUserRepository } from '../../ports';
import { DEPOSIT_REPO } from '../payments/create-payment-intent.use-case';

export interface GetCurrentUserInput {
  userId: string;
}

interface IDepositRepo {
  countCompletedDepositsByUserId(userId: string): Promise<number>;
}

interface CacheEntry {
  data: string;
  expiresAt: number;
}

@Injectable()
export class GetCurrentUserUseCase {
  private readonly profileCache = new Map<string, CacheEntry>();
  private readonly profileTTL = 300_000; // 5 min

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(DEPOSIT_REPO) private readonly depositRepo: IDepositRepo,
  ) {}

  async execute(input: GetCurrentUserInput): Promise<UserDTO> {
    const cacheKey = `user:${input.userId}:profile`;

    // In-memory read-through cache
    const cached = this.profileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return JSON.parse(cached.data) as UserDTO;
    }

    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
    }

    const completedCount = await this.depositRepo.countCompletedDepositsByUserId(input.userId);
    const dto = this.toDto(user, completedCount === 0);
    this.profileCache.set(cacheKey, { data: JSON.stringify(dto), expiresAt: Date.now() + this.profileTTL });
    return dto;
  }

  invalidate(userId: string): void {
    this.profileCache.delete(`user:${userId}:profile`);
  }

  private toDto(user: User, isFirstDeposit: boolean): UserDTO {
    return {
      firstName: user.telegramProfile.firstName,
      lastName: user.telegramProfile.lastName,
      isPremium: user.telegramProfile.isPremium,
      photoUrl: user.telegramProfile.photoUrl,
      balance: user.balance.toString(),
      referralCode: user.referralCode.value,
      referredById: user.referredById,
      status: user.status,
      isFirstDeposit,
    };
  }
}
