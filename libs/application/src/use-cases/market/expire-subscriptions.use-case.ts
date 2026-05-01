import { Injectable, Inject } from '@nestjs/common';
import { SUB_REPOSITORY, type ISubscriptionRepo } from './purchase-subscription.use-case';

@Injectable()
export class ExpireSubscriptionsUseCase {
  constructor(@Inject(SUB_REPOSITORY) private readonly subRepo: ISubscriptionRepo) {}

  async execute(): Promise<number> {
    const expired = await this.subRepo.findExpiredActiveSubscriptions();
    let count = 0;
    for (const sub of expired) {
      try {
        await this.subRepo.deactivateUserSubscription(sub.id);
        count++;
      } catch {
        // Skip failures
      }
    }
    return count;
  }
}
