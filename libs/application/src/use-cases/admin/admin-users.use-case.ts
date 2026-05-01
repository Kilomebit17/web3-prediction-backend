import { Injectable, Inject } from '@nestjs/common';
import { Money } from '@pred/domain';
import {
  USER_REPOSITORY, UNIT_OF_WORK, EVENT_BUS, CACHE_PROVIDER,
  type IUserRepository, type IUnitOfWork, type IEventBus, type ICacheProvider,
} from '../../ports';

export interface AdminAdjustBalanceInput {
  adminUserId: string;
  targetUserId: string;
  delta: string;
  reason: string;
}

export interface AdminBanInput {
  adminUserId: string;
  targetUserId: string;
  reason: string;
}

@Injectable()
export class AdminUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async listUsers(query?: string): Promise<unknown[]> {
    if (query) {
      const byUsername = await this.userRepo.findByUsername(query);
      if (byUsername) return [this.toSummary(byUsername)];
      try {
        const byTg = await this.userRepo.findByTelegramId(BigInt(query));
        if (byTg) return [this.toSummary(byTg)];
      } catch { /* not a valid bigint */ }
      return [];
    }
    return [];
  }

  async adjustBalance(input: AdminAdjustBalanceInput): Promise<unknown> {
    return this.uow.withTransaction(async () => {
      const target = await this.userRepo.findById(input.targetUserId);
      if (!target) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

      const delta = parseFloat(input.delta);
      const deltaMoney = delta >= 0
        ? Money.fromPred(input.delta)
        : Money.fromPred((-delta).toString());

      if (delta >= 0) {
        target.credit(deltaMoney, 'admin_adjustment', { referenceType: 'admin', referenceId: input.adminUserId });
      } else {
        target.debit(deltaMoney, 'admin_adjustment', { referenceType: 'admin', referenceId: input.adminUserId });
      }

      await this.userRepo.update(target);
      await this.cache.del(`user:${input.targetUserId}:profile`);

      // Audit log entry written by interceptor

      return this.toSummary(target);
    });
  }

  async banUser(input: AdminBanInput): Promise<void> {
    const target = await this.userRepo.findById(input.targetUserId);
    if (!target) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    target.ban();
    await this.userRepo.update(target);

    // Audit log
    void this.eventBus; // placeholder for audit event
    void input.adminUserId;
    void input.reason;
  }

  async unbanUser(input: { targetUserId: string }): Promise<void> {
    const target = await this.userRepo.findById(input.targetUserId);
    if (!target) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    target.unban();
    await this.userRepo.update(target);
  }

  private toSummary(user: {
    id: string; telegramId: { value: bigint }; username: string | null;
    balance: { toString(): string }; status: string; role: string;
    stats: { totalWins: number; totalLosses: number; score: bigint };
    createdAt: Date;
  }): Record<string, unknown> {
    return {
      id: user.id, telegramId: user.telegramId.value.toString(),
      username: user.username, balance: user.balance.toString(),
      status: user.status, role: user.role,
      totalBets: user.stats.totalWins + user.stats.totalLosses,
      score: user.stats.score.toString(), createdAt: user.createdAt.toISOString(),
    };
  }
}
