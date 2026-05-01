import { DomainError } from './domain.error';

export class InvalidReferralCodeError extends DomainError {
  constructor(code: string) {
    super('INVALID_REFERRAL_CODE', `Referral code "${code}" is invalid`);
  }
}
