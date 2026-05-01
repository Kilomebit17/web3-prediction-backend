import { Money } from '../value-objects/money.vo';

export class ReferralRewardCalculator {
  static readonly DEPOSIT_PERCENT = 10;
  static readonly WIN_PERCENT = 5;

  depositBonus(depositAmount: Money): Money {
    return depositAmount.mul(ReferralRewardCalculator.DEPOSIT_PERCENT / 100);
  }

  winBonus(netWinAmount: Money): Money {
    return netWinAmount.mul(ReferralRewardCalculator.WIN_PERCENT / 100);
  }
}
