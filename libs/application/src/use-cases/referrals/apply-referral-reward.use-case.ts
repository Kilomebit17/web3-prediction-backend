import { Injectable, Inject } from '@nestjs/common';
import { ReferralRewardCalculator, UserBalanceChanged } from '@pred/domain';
import { Money } from '@pred/domain';
import {
  USER_REPOSITORY, EVENT_BUS,
  type IUserRepository, type IEventBus,
} from '../../ports';

export interface IReferralRepo {
  create(params: { referrerId: string; referredId: string }): Promise<void>;
  findByReferrerId(referredId: string): Promise<Array<{ referrerId: string }>>;
  addEarned(referrerId: string, amount: number): Promise<void>;
}

export const REFERRAL_REPO = Symbol('IReferralRepository');

const calculator = new ReferralRewardCalculator();

@Injectable()
export class ApplyReferralRewardUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(REFERRAL_REPO) private readonly referralRepo: IReferralRepo,
  ) {}

  async onBetWon(referredUserId: string, netWinAmount: string): Promise<void> {
    const referrals = await this.referralRepo.findByReferrerId(referredUserId);
    if (referrals.length === 0) return;

    const winAmount = Money.fromPred(netWinAmount);
    const bonus = calculator.winBonus(winAmount);

    for (const ref of referrals) {
      const referrer = await this.userRepo.findById(ref.referrerId);
      if (!referrer) continue;

      referrer.credit(bonus, 'referral_bonus', {
        referenceType: 'bet_win', referenceId: referredUserId,
      });
      await this.userRepo.update(referrer);
      await this.referralRepo.addEarned(ref.referrerId, bonus.toNumber());

      await this.eventBus.publish(
        new UserBalanceChanged(ref.referrerId, bonus.toString(), 'referral_bonus'),
      );
    }
  }
}
