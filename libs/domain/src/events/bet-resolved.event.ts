import { DomainEvent } from './domain.event';

export class BetResolved extends DomainEvent {
  constructor(
    public readonly betId: string,
    public readonly userId: string,
    public readonly status: 'won' | 'lost' | 'cancelled',
    public readonly netWinAmount: string,
  ) {
    super();
  }
}
