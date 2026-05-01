import type { Price } from '@pred/domain';

export const PRICE_PROVIDER = Symbol('IPriceProvider');

export interface IPriceProvider {
  getCurrent(coinId: string): Promise<Price>;
  getAt(coinId: string, timestamp: Date, toleranceSec?: number): Promise<Price>;
  getCandles(
    coinId: string,
    interval: string,
    limit: number,
  ): Promise<{ openTime: Date; open: Price; high: Price; low: Price; close: Price; volume: Price; closeTime: Date }[]>;
}
