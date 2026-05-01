import { DomainEvent } from './domain.event';

export class UserLoggedIn extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly telegramId: bigint,
  ) {
    super();
  }
}
