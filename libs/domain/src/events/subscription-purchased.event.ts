import { DomainEvent } from './domain.event';

export class SubscriptionPurchased extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly subscriptionId: string,
    public readonly tierId: string,
  ) {
    super();
  }
}
