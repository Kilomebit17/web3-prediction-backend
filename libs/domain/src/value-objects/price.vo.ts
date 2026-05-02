// Internal representation: bigint scaled by 10^8 (Binance 8-decimal precision)
const SCALE = 100_000_000n;
const SCALE_N = 100_000_000;

export class Price {
  private constructor(private readonly _amount: bigint) {}

  static fromUsd(value: number | string): Price {
    const str = String(value).trim();
    if (!/^\d+(\.\d+)?$/.test(str)) {
      throw new RangeError(`Invalid price value: ${value}`);
    }
    const [intStr, decStr = ''] = str.split('.');
    if (decStr.length > 8) {
      throw new RangeError(`Too many decimal places (max 8): ${value}`);
    }
    const intPart = BigInt(intStr ?? '0');
    const decPart = BigInt(decStr.padEnd(8, '0'));
    return new Price(intPart * SCALE + decPart);
  }

  get raw(): bigint {
    return this._amount;
  }

  gt(other: Price): boolean {
    return this._amount > other._amount;
  }

  lt(other: Price): boolean {
    return this._amount < other._amount;
  }

  eq(other: Price): boolean {
    return this._amount === other._amount;
  }

  toString(): string {
    const intPart = this._amount / SCALE;
    const decPart = this._amount % SCALE;
    return `${intPart}.${String(decPart).padStart(8, '0')}`;
  }

  toNumber(): number {
    return Number(this._amount) / SCALE_N;
  }

  toJSON(): string {
    return this.toString();
  }
}
