import { DomainError } from '../errors/domain.error';
import { WalletAddress } from './wallet-address.vo';

describe('WalletAddress', () => {
  describe('ETH / BSC / Polygon', () => {
    const validEvm = '0xAbCdEf1234567890abcdef1234567890AbCdEf12';

    it.each(['eth', 'bsc', 'polygon'] as const)('accepts valid %s address', (chain) => {
      const w = WalletAddress.of(validEvm, chain);
      expect(w.address).toBe(validEvm);
      expect(w.chain).toBe(chain);
    });

    it('throws on address too short', () => {
      expect(() => WalletAddress.of('0x1234', 'eth')).toThrow(DomainError);
    });

    it('throws on missing 0x prefix', () => {
      expect(() => WalletAddress.of('AbCdEf1234567890abcdef1234567890AbCdEf12', 'eth')).toThrow(DomainError);
    });
  });

  describe('Solana', () => {
    const validSolana = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

    it('accepts valid Solana address', () => {
      const w = WalletAddress.of(validSolana, 'solana');
      expect(w.chain).toBe('solana');
    });

    it('throws on too short address', () => {
      expect(() => WalletAddress.of('short', 'solana')).toThrow(DomainError);
    });
  });

  describe('TON', () => {
    // TON user-friendly address = UQ/EQ + 46 base64url chars (48 total)
    const validTon = 'UQBFpDLtLzV-OFnKn9uJoJBLvP3r3fLrRy43YZMD7Ojpabcd';

    it('accepts valid TON address starting with UQ', () => {
      const w = WalletAddress.of(validTon, 'ton');
      expect(w.chain).toBe('ton');
    });

    it('throws on invalid TON format', () => {
      expect(() => WalletAddress.of('invalid-ton', 'ton')).toThrow(DomainError);
    });
  });
});
