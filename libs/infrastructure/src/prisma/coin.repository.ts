import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ICoinRepository, CoinDTO, CandleDTO } from '@pred/application';
import { Price } from '@pred/domain';
import { PrismaService } from './prisma.service';

@Injectable()
export class CoinRepository implements ICoinRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CoinDTO[]> {
    const rows = await this.prisma.coin.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findById(id: string): Promise<CoinDTO | null> {
    const row = await this.prisma.coin.findUnique({ where: { id } });
    return row ? this.toDto(row) : null;
  }

  async findActive(): Promise<CoinDTO[]> {
    const rows = await this.prisma.coin.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findCandles(
    coinId: string,
    interval: string,
    limit: number,
  ): Promise<CandleDTO[]> {
    const rows = await this.prisma.priceCandle.findMany({
      where: { coinId, interval },
      orderBy: { openTime: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.candleToDto(r));
  }

  // ── Mapping ──────────────────────────────────────────────────────────────

  private toDto(row: Prisma.CoinGetPayload<Record<string, never>>): CoinDTO {
    return {
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      binanceSymbol: row.binanceSymbol,
      iconUrl: row.iconUrl,
      color: row.color,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    };
  }

  private candleToDto(
    row: Prisma.PriceCandleGetPayload<Record<string, never>>,
  ): CandleDTO {
    return {
      coinId: row.coinId,
      interval: row.interval,
      openTime: row.openTime,
      open: Price.fromUsd(row.open.toFixed(8)),
      high: Price.fromUsd(row.high.toFixed(8)),
      low: Price.fromUsd(row.low.toFixed(8)),
      close: Price.fromUsd(row.close.toFixed(8)),
      volume: Price.fromUsd(row.volume.toFixed(8)),
      closeTime: row.closeTime,
    };
  }
}
