import { SCORE_TABLE } from '@pred/shared';

export type ScoreTable = typeof SCORE_TABLE;

export class ScoreCalculator {
  constructor(private readonly table: ScoreTable = SCORE_TABLE) {}

  delta(multiplierValue: number, status: 'won' | 'lost'): bigint {
    const entry = this.table.find((e) => e.multiplier === multiplierValue);
    if (!entry) throw new RangeError(`No score entry for multiplier ${multiplierValue}`);
    return status === 'won' ? BigInt(entry.win) : -BigInt(entry.lose);
  }
}
