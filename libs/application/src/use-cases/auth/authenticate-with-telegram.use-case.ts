import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  User,
  Money,
  TelegramUserId,
  ReferralCode,
  type TelegramProfile,
  type UserStats,
  UserRegistered,
  UserLoggedIn,
  type UserRole,
  type UserStatus,
} from '@pred/domain';
import type { UserDTO } from '@pred/shared';
import {
  USER_REPOSITORY,
  UNIT_OF_WORK,
  EVENT_BUS,
  TELEGRAM_VERIFIER,
  AUTH_TOKEN_SERVICE,
  CACHE_PROVIDER,
  type IUserRepository,
  type IUnitOfWork,
  type IEventBus,
  type ITelegramVerifier,
  type IAuthTokenService,
  type ICacheProvider,
} from '../../ports';
import { REFERRAL_REPO, type IReferralRepo } from '../referrals/apply-referral-reward.use-case';

export interface AuthenticateWithTelegramInput {
  initDataRaw: string;
}

export interface AuthenticateWithTelegramOutput {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
  isNewUser: boolean;
}

@Injectable()
export class AuthenticateWithTelegramUseCase {
  private readonly initialBalance: number;
  private readonly antiReplayEnabled: boolean;
  private readonly replayTTL: number;

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(TELEGRAM_VERIFIER) private readonly verifier: ITelegramVerifier,
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokenService: IAuthTokenService,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    @Inject(REFERRAL_REPO) private readonly referralRepo: IReferralRepo,
  ) {
    this.initialBalance = parseInt(process.env.INITIAL_BALANCE ?? '1000', 10);
    this.antiReplayEnabled = process.env.TELEGRAM_ANTIREPLAY_ENABLED !== 'false';
    this.replayTTL = parseInt(process.env.TELEGRAM_FRESH_INITDATA_TTL ?? '60', 10);
  }

  async execute(
    input: AuthenticateWithTelegramInput,
  ): Promise<AuthenticateWithTelegramOutput> {
    // 1. Verify initData
    const parsed = this.verifier.verify(input.initDataRaw);

    // 2. Anti-replay check
    const replayKey = `tma:used_hash:${parsed.hash}`;
    if (this.antiReplayEnabled) {
      const alreadyUsed = await this.cache.exists(replayKey);
      if (alreadyUsed) {
        throw Object.assign(
          new Error('Telegram initData replay detected'),
          { code: 'AUTH_DATA_EXPIRED' },
        );
      }
    }

    // 3. Parse start_param for referral code
    const refCodeCandidate = this.extractReferralCode(parsed.startParam);

    // 4. Execute in transaction
    const result = await this.uow.withTransaction(async () => {
      const tgId = BigInt(parsed.user.id);
      let user = await this.userRepo.findByTelegramId(tgId);

      let isNewUser = false;
      let referredById: string | null = null;

      if (!user) {
        // New user
        referredById = await this.resolveReferrer(refCodeCandidate);

        const freshStats: UserStats = {
          totalWins: 0,
          totalLosses: 0,
          bestWinStreak: 0,
          score: 0n,
        };

        const profile = this.toTelegramProfile(parsed.user);

        user = new User(
          randomUUID(),
          TelegramUserId.of(tgId),
          profile,
          null,
          Money.fromPred(this.initialBalance),
          freshStats,
          await this.generateUniqueReferralCode(),
          referredById,
          'user' as UserRole,
          'active' as UserStatus,
          [],
          new Date(),
          new Date(),
          new Date(),
        );

        await this.userRepo.create(user);

        // #9: Create referral record
        if (referredById) {
          await this.referralRepo.create({ referrerId: referredById, referredId: user.id });
        }

        isNewUser = true;

        await this.eventBus.publish(
          new UserRegistered(user.id, tgId, referredById),
        );
      } else {
        // Existing user
        if (user.status === 'banned') {
          throw Object.assign(new Error('User is banned'), {
            code: 'USER_BANNED',
          });
        }

        user.updateTelegramProfile(this.toTelegramProfile(parsed.user));
        await this.userRepo.update(user);

        await this.eventBus.publish(
          new UserLoggedIn(user.id, tgId),
        );
      }

      return { user, isNewUser };
    });

    // 5. Anti-replay: mark hash as used (short TTL — only prevents rapid replay)
    if (this.antiReplayEnabled) {
      await this.cache.set(replayKey, '1', this.replayTTL);
    }

    // 6. Issue tokens
    const { user, isNewUser } = result;
    const tokens = await this.tokenService.issueTokenPair(
      user.id,
      user.telegramId.value,
      user.role,
    );

    // 7. Return DTO
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toUserDTO(user),
      isNewUser,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private extractReferralCode(startParam?: string): string | null {
    if (!startParam) return null;
    const match = startParam.match(/^ref_(PRED_[A-Z0-9]{6})$/);
    return match ? match[1] : null;
  }

  private async resolveReferrer(code: string | null): Promise<string | null> {
    if (!code) return null;
    const referrer = await this.userRepo.findByReferralCode(code);
    return referrer ? referrer.id : null;
  }

  private async generateUniqueReferralCode(): Promise<ReferralCode> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = ReferralCode.generate();
      const existing = await this.userRepo.findByReferralCode(code.value);
      if (!existing) return code;
    }
    throw new Error('Failed to generate unique referral code');
  }

  private toTelegramProfile(
    user: {
      username?: string;
      firstName: string;
      lastName?: string;
      languageCode?: string;
      isPremium?: boolean;
      photoUrl?: string;
      allowsWriteToPm?: boolean;
    },
  ): TelegramProfile {
    return {
      username: user.username ?? null,
      firstName: user.firstName,
      lastName: user.lastName ?? null,
      languageCode: user.languageCode ?? null,
      isPremium: user.isPremium ?? false,
      photoUrl: user.photoUrl ?? null,
      allowsWriteToPm: user.allowsWriteToPm ?? false,
    };
  }

  private toUserDTO(user: User): UserDTO {
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
