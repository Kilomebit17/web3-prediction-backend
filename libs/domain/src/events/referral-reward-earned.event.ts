import { DomainEvent } from './domain.event';

export class ReferralRewardEarned extends DomainEvent {
  constructor(
    public readonly referrerId: string,
    public readonly referredId: string,
    public readonly amount: string,
    public readonly source: 'deposit' | 'bet_win',
  ) {
    super();
  }
}
