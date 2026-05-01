import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { PaymentProvider, PaymentIntentStatus } from '@prisma/client';

export interface DepositPackageDTO {
  id: string;
  amount: string;
  bonusAmount: string;
  bonusPercent: number;
  priceUsd: string;
  tag: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface PaymentIntentDTO {
  id: string;
  userId: string;
  packageId: string;
  provider: string;
  providerIntentId: string | null;
  status: string;
  amountUsd: string;
  predAmount: string;
  createdAt: string;
  completedAt: string | null;
}

@Injectable()
export class DepositRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActivePackages(): Promise<DepositPackageDTO[]> {
    const rows = await this.prisma.depositPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((p) => ({
      id: p.id, amount: p.amount.toFixed(4), bonusAmount: p.bonusAmount.toFixed(4),
      bonusPercent: p.bonusPercent, priceUsd: p.priceUsd.toFixed(2),
      tag: p.tag, isActive: p.isActive, sortOrder: p.sortOrder,
    }));
  }

  async findPackageById(id: string): Promise<DepositPackageDTO | null> {
    const row = await this.prisma.depositPackage.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id, amount: row.amount.toFixed(4), bonusAmount: row.bonusAmount.toFixed(4),
      bonusPercent: row.bonusPercent, priceUsd: row.priceUsd.toFixed(2),
      tag: row.tag, isActive: row.isActive, sortOrder: row.sortOrder,
    };
  }

  async createPaymentIntent(params: {
    userId: string; packageId: string; provider: PaymentProvider;
    amountUsd: number; predAmount: number; idempotencyKey: string;
  }): Promise<PaymentIntentDTO> {
    const intent = await this.prisma.paymentIntent.create({
      data: {
        userId: params.userId, packageId: params.packageId,
        provider: params.provider, amountUsd: params.amountUsd, predAmount: params.predAmount,
        idempotencyKey: params.idempotencyKey, status: 'pending',
      },
    });
    return this.toDto(intent);
  }

  async findIntentById(id: string): Promise<PaymentIntentDTO | null> {
    const row = await this.prisma.paymentIntent.findUnique({ where: { id } });
    return row ? this.toDto(row) : null;
  }

  async findIntentByIdempotencyKey(key: string): Promise<PaymentIntentDTO | null> {
    const row = await this.prisma.paymentIntent.findUnique({ where: { idempotencyKey: key } });
    return row ? this.toDto(row) : null;
  }

  async completeIntent(id: string, providerIntentId: string): Promise<PaymentIntentDTO> {
    const row = await this.prisma.paymentIntent.update({
      where: { id },
      data: { status: 'completed', providerIntentId, completedAt: new Date() },
    });
    return this.toDto(row);
  }

  async failIntent(id: string): Promise<PaymentIntentDTO> {
    const row = await this.prisma.paymentIntent.update({
      where: { id },
      data: { status: 'failed' },
    });
    return this.toDto(row);
  }

  private toDto(row: {
    id: string; userId: string; packageId: string; provider: PaymentProvider;
    providerIntentId: string | null; status: PaymentIntentStatus;
    amountUsd: { toFixed(d: number): string }; predAmount: { toFixed(d: number): string };
    createdAt: Date; completedAt: Date | null;
  }): PaymentIntentDTO {
    return {
      id: row.id, userId: row.userId, packageId: row.packageId,
      provider: row.provider, providerIntentId: row.providerIntentId,
      status: row.status, amountUsd: row.amountUsd.toFixed(2),
      predAmount: row.predAmount.toFixed(4),
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    };
  }
}
