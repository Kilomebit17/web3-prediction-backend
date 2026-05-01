import { DomainError } from './domain.error';

export class BetAlreadyResolvedError extends DomainError {
  constructor(betId: string) {
    super('BET_ALREADY_RESOLVED', `Bet ${betId} has already been resolved`);
  }
}
