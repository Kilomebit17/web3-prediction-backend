import { DomainEvent } from './domain.event';

export class UserRegistered extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly telegramId: bigint,
    public readonly referredById: string | null,
  ) {
    super();
  }
}
