import { DomainError } from './domain.error';

export class BetExpiredError extends DomainError {
  constructor(betId: string) {
    super('BET_EXPIRED', `Bet ${betId} has expired and cannot be cancelled`);
  }
}
