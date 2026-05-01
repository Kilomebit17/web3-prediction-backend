import { randomBytes } from 'crypto';
import { InvalidReferralCodeError } from '../errors/invalid-referral-code.error';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class ReferralCode {
  static readonly PATTERN = /^PRED_[A-Z0-9]{6}$/;

  private constructor(public readonly value: string) {}

  static generate(): ReferralCode {
    const bytes = randomBytes(6);
    const suffix = Array.from(bytes)
      .map((b) => CHARS[b % CHARS.length])
      .join('');
    return new ReferralCode(`PRED_${suffix}`);
  }

  static parse(raw: string): ReferralCode {
    if (!ReferralCode.PATTERN.test(raw)) throw new InvalidReferralCodeError(raw);
    return new ReferralCode(raw);
  }
}
