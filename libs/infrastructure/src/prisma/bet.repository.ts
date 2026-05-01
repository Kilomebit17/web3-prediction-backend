import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { IBetRepository } from '@pred/application';
import {
  Bet,
  Money,
  Price,
  Multiplier,
  type Direction,
  type BetStatus,
} from '@pred/domain';
import { PrismaService } from './prisma.service';

@Injectable()
export class BetRepository implements IBetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Bet | null> {
    const row = await this.prisma.bet.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByUserId(userId: string): Promise<Bet[]> {
    const rows = await this.prisma.bet.findMany({
      where: { userId, status: 'active' },
      orderBy: { placedAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findHistoryByUserId(
    userId: string,
    params: {
      cursor?: string;
      limit: number;
      coinId?: string;
      status?: string;
    },
  ): Promise<{ data: Bet[]; nextCursor: string | null }> {
    const where: Prisma.BetWhereInput = { userId };
    if (params.coinId) where.coinId = params.coinId;
    if (params.status) where.status = params.status as Prisma.EnumBetStatusFilter['equals'];

    const rows = await this.prisma.bet.findMany({
      where,
      orderBy: { placedAt: 'desc' },
      cursor: params.cursor ? { id: params.cursor } : undefined,
      take: params.limit + 1,
      skip: params.cursor ? 1 : 0,
    });

    const hasMore = rows.length > params.limit;
    const data = hasMore ? rows.slice(0, params.limit) : rows;
    const lastRow = data.length > 0 ? data[data.length - 1] : null;
    const nextCursor = hasMore && lastRow ? lastRow.id : null;

    return { data: data.map((r) => this.toDomain(r)), nextCursor };
  }

  async findExpiredActive(now: Date): Promise<Bet[]> {
    const rows = await this.prisma.bet.findMany({
      where: {
        status: 'active',
        expiresAt: { lte: now },
      },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(bet: Bet): Promise<void> {
    await this.prisma.bet.upsert({
      where: { id: bet.id },
      create: this.toPrismaCreate(bet),
      update: this.toPrismaUpdate(bet),
    });
  }

  async create(bet: Bet): Promise<void> {
    await this.prisma.bet.create({ data: this.toPrismaCreate(bet) });
  }

  async update(bet: Bet): Promise<void> {
    await this.prisma.bet.update({
      where: { id: bet.id },
      data: this.toPrismaUpdate(bet),
    });
  }

  // ── Mapping ──────────────────────────────────────────────────────────────

  private toDomain(row: Prisma.BetGetPayload<Record<string, never>>): Bet {
    return new Bet(
      row.id,
      row.userId,
      row.coinId,
      row.direction as Direction,
      Money.fromPred(row.amount.toFixed(4)),
      Multiplier.of(row.multiplier),
      row.durationSeconds,
      Price.fromUsd(row.entryPrice.toFixed(8)),
      row.endPrice ? Price.fromUsd(row.endPrice.toFixed(8)) : null,
      row.status as BetStatus,
      row.netWinAmount ? Money.fromPred(row.netWinAmount.toFixed(4)) : null,
      row.placedAt,
      row.expiresAt,
      row.resolvedAt,
    );
  }

  private toPrismaCreate(bet: Bet): Prisma.BetCreateInput {
    return {
      id: bet.id,
      user: { connect: { id: bet.userId } },
      coin: { connect: { id: bet.coinId } },
      direction: bet.direction,
      amount: new Prisma.Decimal(bet.amount.toString()),
      multiplier: bet.multiplier.value,
      liquidationPercent: bet.multiplier.liquidationPercent,
      durationSeconds: bet.durationSeconds,
      entryPrice: new Prisma.Decimal(bet.entryPrice.toString()),
      endPrice: bet.endPrice ? new Prisma.Decimal(bet.endPrice.toString()) : null,
      status: bet.status,
      netWinAmount: bet.netWinAmount
        ? new Prisma.Decimal(bet.netWinAmount.toString())
        : null,
      placedAt: bet.placedAt,
      expiresAt: bet.expiresAt,
      resolvedAt: bet.resolvedAt,
    };
  }

  private toPrismaUpdate(bet: Bet): Prisma.BetUpdateInput {
    return {
      direction: bet.direction,
      amount: new Prisma.Decimal(bet.amount.toString()),
      multiplier: bet.multiplier.value,
      liquidationPercent: bet.multiplier.liquidationPercent,
      durationSeconds: bet.durationSeconds,
      entryPrice: new Prisma.Decimal(bet.entryPrice.toString()),
      endPrice: bet.endPrice ? new Prisma.Decimal(bet.endPrice.toString()) : null,
      status: bet.status,
      netWinAmount: bet.netWinAmount
        ? new Prisma.Decimal(bet.netWinAmount.toString())
        : null,
      placedAt: bet.placedAt,
      expiresAt: bet.expiresAt,
      resolvedAt: bet.resolvedAt,
    };
  }
}
