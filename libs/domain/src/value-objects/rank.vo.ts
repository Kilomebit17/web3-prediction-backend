import type { Money } from './money.vo';

export interface Rank {
  id: string;
  name: string;
  minBalance: Money;
  tierOrder: number;
}
