import { InsufficientBalanceError } from '../errors/insufficient-balance.error';

// Internal representation: bigint scaled by 10^4
// 1 PRED = 10_000n units; max safe amount ≤ ~9 * 10^11 PRED (within BigInt)
const SCALE = 10_000n;
const SCALE_N = 10_000;

export class Money {
  private constructor(private readonly _amount: bigint) {}

  static fromPred(value: number | string): Money {
    const str = String(value).trim();
    if (!/^-?\d+(\.\d+)?$/.test(str)) {
      throw new RangeError(`Invalid money value: ${value}`);
    }
    const [intStr, decStr = ''] = str.split('.');
    if (decStr.length > 4) {
      throw new RangeError(`Too many decimal places (max 4): ${value}`);
    }
    const intPart = BigInt(intStr ?? '0');
    const decPart = BigInt(decStr.padEnd(4, '0'));
    const raw = intPart * SCALE + (intPart < 0n ? -decPart : decPart);
    if (raw < 0n) {
      throw new RangeError(`Money value must be non-negative: ${value}`);
    }
    return new Money(raw);
  }

  static zero(): Money {
    return new Money(0n);
  }

  // Internal factory — allows negative values for Transaction.amount (signed debits)
  static fromRawBigInt(raw: bigint): Money {
    return new Money(raw);
  }

  get raw(): bigint {
    return this._amount;
  }

  add(other: Money): Money {
    return new Money(this._amount + other._amount);
  }

  sub(other: Money): Money {
    const result = this._amount - other._amount;
    if (result < 0n) throw new InsufficientBalanceError();
    return new Money(result);
  }

  // factor may be fractional; uses float internally — safe for amounts ≤ 10^11 PRED
  mul(factor: number): Money {
    const result = BigInt(Math.round(Number(this._amount) * factor));
    return new Money(result);
  }

  neg(): Money {
    return new Money(-this._amount);
  }

  gte(other: Money): boolean {
    return this._amount >= other._amount;
  }

  gt(other: Money): boolean {
    return this._amount > other._amount;
  }

  eq(other: Money): boolean {
    return this._amount === other._amount;
  }

  toString(): string {
    const abs = this._amount < 0n ? -this._amount : this._amount;
    const sign = this._amount < 0n ? '-' : '';
    const intPart = abs / SCALE;
    const decPart = abs % SCALE;
    return `${sign}${intPart}.${String(decPart).padStart(4, '0')}`;
  }

  toNumber(): number {
    return Number(this._amount) / SCALE_N;
  }
}
