import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ITransactionRepository } from '@pred/application';
import {
  Transaction,
  Money,
  type TransactionType,
} from '@pred/domain';
import { PrismaService } from './prisma.service';

@Injectable()
export class TransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: key },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(
    userId: string,
    params: { cursor?: string; limit: number },
  ): Promise<{ data: Transaction[]; nextCursor: string | null }> {
    const rows = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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

  async save(transaction: Transaction): Promise<void> {
    await this.prisma.transaction.upsert({
      where: { id: transaction.id },
      create: this.toPrismaCreate(transaction),
      update: this.toPrismaUpdate(transaction),
    });
  }

  async create(transaction: Transaction): Promise<void> {
    await this.prisma.transaction.create({
      data: this.toPrismaCreate(transaction),
    });
  }

  // ── Mapping ──────────────────────────────────────────────────────────────

  private toDomain(
    row: Prisma.TransactionGetPayload<Record<string, never>>,
  ): Transaction {
    const rawAmount = BigInt(
      row.amount.toFixed(4).replace('.', '').replace('-', ''),
    );
    const signedRaw = row.amount.toNumber() < 0 ? -rawAmount : rawAmount;

    return new Transaction(
      row.id,
      row.userId,
      row.type as TransactionType,
      Money.fromRawBigInt(signedRaw),
      Money.fromPred(row.balanceAfter.toFixed(4)),
      row.referenceType,
      row.referenceId,
      row.idempotencyKey,
      (row.metadata as Record<string, unknown>) ?? {},
      row.createdAt,
    );
  }

  private toPrismaCreate(
    transaction: Transaction,
  ): Prisma.TransactionCreateInput {
    return {
      id: transaction.id,
      user: { connect: { id: transaction.userId } },
      type: transaction.type,
      amount: new Prisma.Decimal(transaction.amount.toString()),
      balanceAfter: new Prisma.Decimal(transaction.balanceAfter.toString()),
      referenceType: transaction.referenceType,
      referenceId: transaction.referenceId,
      idempotencyKey: transaction.idempotencyKey,
      metadata: transaction.metadata as Prisma.InputJsonValue,
      createdAt: transaction.createdAt,
    };
  }

  private toPrismaUpdate(
    transaction: Transaction,
  ): Prisma.TransactionUpdateInput {
    return {
      type: transaction.type,
      amount: new Prisma.Decimal(transaction.amount.toString()),
      balanceAfter: new Prisma.Decimal(transaction.balanceAfter.toString()),
      referenceType: transaction.referenceType,
      referenceId: transaction.referenceId,
      metadata: transaction.metadata as Prisma.InputJsonValue,
    };
  }
}
