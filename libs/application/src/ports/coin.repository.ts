import type { Price } from '@pred/domain';

export interface CoinDTO {
  id: string;
  symbol: string;
  name: string;
  binanceSymbol: string;
  iconUrl: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CandleDTO {
  coinId: string;
  interval: string;
  openTime: Date;
  open: Price;
  high: Price;
  low: Price;
  close: Price;
  volume: Price;
  closeTime: Date;
}

export const COIN_REPOSITORY = Symbol('ICoinRepository');

export interface ICoinRepository {
  findAll(): Promise<CoinDTO[]>;
  findById(id: string): Promise<CoinDTO | null>;
  findActive(): Promise<CoinDTO[]>;
  findCandles(
    coinId: string,
    interval: string,
    limit: number,
  ): Promise<CandleDTO[]>;
}
