import { Injectable, Inject } from '@nestjs/common';
import { User } from '@pred/domain';
import type { UserDTO } from '@pred/shared';
import {
  USER_REPOSITORY,
  CACHE_PROVIDER,
  type IUserRepository,
  type ICacheProvider,
} from '../../ports';
import { DEPOSIT_REPO } from '../payments/create-payment-intent.use-case';

export interface GetCurrentUserInput {
  userId: string;
}

interface IDepositRepo {
  countCompletedDepositsByUserId(userId: string): Promise<number>;
}

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(DEPOSIT_REPO) private readonly depositRepo: IDepositRepo,
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

    const completedCount = await this.depositRepo.countCompletedDepositsByUserId(input.userId);
    const dto = this.toDto(user, completedCount === 0);
    await this.cache.set(cacheKey, JSON.stringify(dto), 300); // TTL 5m
    return dto;
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
