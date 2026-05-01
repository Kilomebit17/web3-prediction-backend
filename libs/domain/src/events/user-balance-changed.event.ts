import { DomainEvent } from './domain.event';

export class UserBalanceChanged extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly delta: string,
    public readonly reason: string,
  ) {
    super();
  }
}
