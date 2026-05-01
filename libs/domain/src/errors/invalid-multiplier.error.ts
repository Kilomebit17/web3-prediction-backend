import { DomainError } from './domain.error';

export class InvalidMultiplierError extends DomainError {
  constructor(value: number) {
    super('INVALID_MULTIPLIER', `Multiplier ${value} is not valid (allowed: 2–10)`);
  }
}
