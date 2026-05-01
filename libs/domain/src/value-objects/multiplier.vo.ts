import { MULTIPLIER_TABLE } from '@pred/shared';
import { InvalidMultiplierError } from '../errors/invalid-multiplier.error';

export type MultiplierValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export class Multiplier {
  readonly value: MultiplierValue;
  readonly liquidationPercent: number;

  private constructor(value: MultiplierValue, liquidationPercent: number) {
    this.value = value;
    this.liquidationPercent = liquidationPercent;
  }

  static of(value: number): Multiplier {
    const entry = MULTIPLIER_TABLE.find((e) => e.value === value);
    if (!entry) throw new InvalidMultiplierError(value);
    return new Multiplier(value as MultiplierValue, entry.liquidationPercent);
  }
}
