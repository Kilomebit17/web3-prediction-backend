import { Injectable, Inject } from '@nestjs/common';
import { Money, SubscriptionPurchased, UserBalanceChanged } from '@pred/domain';
import {
  USER_REPOSITORY, UNIT_OF_WORK, EVENT_BUS, CACHE_PROVIDER,
  type IUserRepository, type IUnitOfWork, type IEventBus, type ICacheProvider,
} from '../../ports';

export interface PurchaseSubscriptionInput {
  userId: string;
  subscriptionId: string;
  tierId: string;
}

export interface PurchaseSubscriptionOutput {
  userSubId: string;
  subscriptionId: string;
  activatedAt: string;
  expiresAt: string | null;
}

export interface ISubscriptionRepo {
  findById(id: string): Promise<{
    isVipOnly: boolean;
    tiers: Array<{ id: string; durationDays: number | null; price: string; burnAmount: string }>;
  } | null>;
  findAll(category?: string): Promise<unknown[]>;
  getUserActiveSubscriptions(userId: string): Promise<Array<{ subscriptionId: string }>>;
  createUserSubscription(params: {
    userId: string; subscriptionId: string; tierId: string; durationDays: number | null;
  }): Promise<{ id: string; expiresAt: Date | null }>;
  findExpiredActiveSubscriptions(): Promise<Array<{ id: string }>>;
  deactivateUserSubscription(id: string): Promise<void>;
}

export const SUB_REPOSITORY = Symbol('ISubscriptionRepository');

@Injectable()
export class PurchaseSubscriptionUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    @Inject(SUB_REPOSITORY) private readonly subRepo: ISubscriptionRepo,
  ) {}

  async execute(input: PurchaseSubscriptionInput): Promise<PurchaseSubscriptionOutput> {
    return this.uow.withTransaction(async () => {
      const user = await this.userRepo.findById(input.userId);
      if (!user) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

      const sub = await this.subRepo.findById(input.subscriptionId);
      if (!sub) throw Object.assign(new Error('Subscription not found'), { code: 'NOT_FOUND' });

      const tier = sub.tiers.find((t) => t.id === input.tierId);
      if (!tier) throw Object.assign(new Error('Tier not found'), { code: 'NOT_FOUND' });

      if (sub.isVipOnly) {
        const activeSubs = await this.subRepo.getUserActiveSubscriptions(input.userId);
        if (!activeSubs.some((s) => s.subscriptionId === 'pred_pass')) {
          throw Object.assign(new Error('VIP Pass required'), { code: 'SUBSCRIPTION_REQUIRED' });
        }
      }

      const price = Money.fromPred(tier.price);
      if (price.gt(user.balance)) {
        throw Object.assign(new Error('Insufficient balance'), { code: 'INSUFFICIENT_BALANCE' });
      }

      user.debit(price, 'subscription_purchase', {
        referenceType: 'subscription', referenceId: input.subscriptionId,
      });
      await this.userRepo.update(user);

      const userSub = await this.subRepo.createUserSubscription({
        userId: input.userId, subscriptionId: input.subscriptionId,
        tierId: input.tierId, durationDays: tier.durationDays,
      });

      await this.cache.del(`user:${input.userId}:profile`);

      await this.eventBus.publish(new SubscriptionPurchased(input.userId, input.subscriptionId, input.tierId));
      await this.eventBus.publish(new UserBalanceChanged(input.userId, tier.price, 'subscription_purchase'));

      return {
        userSubId: userSub.id, subscriptionId: input.subscriptionId,
        activatedAt: new Date().toISOString(), expiresAt: userSub.expiresAt?.toISOString() ?? null,
      };
    });
  }
}
