import { DomainError } from './domain.error';

export class InsufficientBalanceError extends DomainError {
  constructor() {
    super('INSUFFICIENT_BALANCE', 'Insufficient balance for this operation');
  }
}
