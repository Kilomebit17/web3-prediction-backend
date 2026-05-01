import { DomainEvent } from './domain.event';

export class RankUpgraded extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly fromRankId: string,
    public readonly toRankId: string,
  ) {
    super();
  }
}
