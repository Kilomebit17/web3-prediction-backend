import { Injectable, Inject } from '@nestjs/common';
import { Price } from '@pred/domain';
import type { IPriceProvider, ICoinRepository } from '@pred/application';
import { COIN_REPOSITORY } from '@pred/application';

interface TickerResponse {
  symbol: string;
  price: string;
}

interface KlineTuple {
  0: number; // openTime
  1: string; // open
  2: string; // high
  3: string; // low
  4: string; // close
  5: string; // volume
  6: number; // closeTime
}

@Injectable()
export class BinancePriceProvider implements IPriceProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    @Inject(COIN_REPOSITORY) private readonly coinRepo: ICoinRepository,
  ) {
    this.baseUrl = process.env.BINANCE_BASE_URL ?? 'https://data-api.binance.vision';
    this.timeoutMs = parseInt(process.env.BINANCE_TIMEOUT_MS ?? '5000', 10);
  }

  async getCurrent(coinId: string): Promise<Price> {
    const symbol = await this.getSymbol(coinId);
    const url = `${this.baseUrl}/api/v3/ticker/price?symbol=${symbol}`;
    const data = await this.fetchJson<TickerResponse>(url);
    return Price.fromUsd(data.price);
  }

  async getAt(
    coinId: string,
    timestamp: Date,
    toleranceSec = 2,
  ): Promise<Price> {
    const symbol = await this.getSymbol(coinId);
    const targetMs = timestamp.getTime();
    const windowMs = toleranceSec * 1000;

    // Fetch klines covering the target timestamp
    const startMs = targetMs - windowMs * 5; // wider window for safety
    const endMs = targetMs + windowMs * 5;

    const url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=1s&startTime=${startMs}&endTime=${endMs}&limit=50`;
    const candles = await this.fetchJson<KlineTuple[]>(url);

    if (candles.length === 0) {
      // Fallback: fetch 1m candles
      const fallbackUrl = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=1m&startTime=${startMs}&endTime=${endMs}&limit=10`;
      const fallbackCandles = await this.fetchJson<KlineTuple[]>(fallbackUrl);
      if (fallbackCandles.length === 0) {
        return this.getCurrent(coinId);
      }
      return Price.fromUsd(fallbackCandles[fallbackCandles.length - 1][4]);
    }

    // Find closest candle to target
    const first = candles[0];
    if (!first) return this.getCurrent(coinId);
    let closest = first;
    let minDiff = Math.abs(closest[0] - targetMs);
    for (const c of candles) {
      const diff = Math.abs(c[0] - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }

    // If closest is within tolerance, use it
    if (minDiff <= windowMs) {
      return Price.fromUsd(closest[4]); // close price
    }

    // Fallback to current
    return this.getCurrent(coinId);
  }

  async getCandles(
    coinId: string,
    interval: string,
    limit: number,
  ): Promise<
    {
      openTime: Date;
      open: Price;
      high: Price;
      low: Price;
      close: Price;
      volume: Price;
      closeTime: Date;
    }[]
  > {
    const symbol = await this.getSymbol(coinId);
    const url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const klines = await this.fetchJson<KlineTuple[]>(url);

    return klines.map((k) => ({
      openTime: new Date(k[0]),
      open: Price.fromUsd(k[1]),
      high: Price.fromUsd(k[2]),
      low: Price.fromUsd(k[3]),
      close: Price.fromUsd(k[4]),
      volume: Price.fromUsd(k[5]),
      closeTime: new Date(k[6]),
    }));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async getSymbol(coinId: string): Promise<string> {
    const coin = await this.coinRepo.findById(coinId);
    if (!coin) {
      throw Object.assign(new Error(`Coin not found: ${coinId}`), {
        code: 'NOT_FOUND',
      });
    }
    return coin.binanceSymbol;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
