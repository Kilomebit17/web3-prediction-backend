import { InvalidReferralCodeError } from '../errors/invalid-referral-code.error';
import { ReferralCode } from './referral-code.vo';

describe('ReferralCode', () => {
  describe('generate', () => {
    it('generates code matching pattern', () => {
      const code = ReferralCode.generate();
      expect(ReferralCode.PATTERN.test(code.value)).toBe(true);
    });

    it('generates unique codes', () => {
      const codes = new Set(Array.from({ length: 100 }, () => ReferralCode.generate().value));
      expect(codes.size).toBe(100);
    });
  });

  describe('parse', () => {
    it('parses valid code', () => {
      const code = ReferralCode.parse('PRED_ABCDEF');
      expect(code.value).toBe('PRED_ABCDEF');
    });

    it('parses code with digits', () => {
      expect(ReferralCode.parse('PRED_A1B2C3').value).toBe('PRED_A1B2C3');
    });

    it('throws on lowercase', () => {
      expect(() => ReferralCode.parse('pred_abcdef')).toThrow(InvalidReferralCodeError);
    });

    it('throws on wrong prefix', () => {
      expect(() => ReferralCode.parse('REF_ABCDEF')).toThrow(InvalidReferralCodeError);
    });

    it('throws on wrong length suffix', () => {
      expect(() => ReferralCode.parse('PRED_ABCDE')).toThrow(InvalidReferralCodeError);
      expect(() => ReferralCode.parse('PRED_ABCDEFG')).toThrow(InvalidReferralCodeError);
    });

    it('throws on empty string', () => {
      expect(() => ReferralCode.parse('')).toThrow(InvalidReferralCodeError);
    });
  });
});
