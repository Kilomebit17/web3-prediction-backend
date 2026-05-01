import { DomainEvent } from './domain.event';

export class BetPlaced extends DomainEvent {
  constructor(
    public readonly betId: string,
    public readonly userId: string,
    public readonly coinId: string,
    public readonly amount: string,
    public readonly multiplier: number,
  ) {
    super();
  }
}
