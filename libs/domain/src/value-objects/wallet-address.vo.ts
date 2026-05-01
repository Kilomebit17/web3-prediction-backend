import { DomainError } from '../errors/domain.error';

export type Chain = 'ton' | 'eth' | 'bsc' | 'polygon' | 'solana';

const EVM_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
// TON: UQ.../EQ... raw address, base64url, or hex
const TON_PATTERN = /^(UQ|EQ)[a-zA-Z0-9_-]{46}$/;

const VALIDATORS: Record<Chain, (addr: string) => boolean> = {
  eth:     (a) => EVM_PATTERN.test(a),
  bsc:     (a) => EVM_PATTERN.test(a),
  polygon: (a) => EVM_PATTERN.test(a),
  solana:  (a) => SOLANA_PATTERN.test(a),
  ton:     (a) => TON_PATTERN.test(a),
};

export class WalletAddress {
  private constructor(
    public readonly address: string,
    public readonly chain: Chain,
  ) {}

  static of(address: string, chain: Chain): WalletAddress {
    const validate = VALIDATORS[chain];
    if (!validate(address)) {
      throw new DomainError('INVALID_WALLET_ADDRESS', `Address "${address}" is not valid for chain ${chain}`);
    }
    return new WalletAddress(address, chain);
  }
}
