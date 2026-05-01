import { DomainEvent } from './domain.event';

export class WalletLinked extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly address: string,
    public readonly chain: string,
  ) {
    super();
  }
}
