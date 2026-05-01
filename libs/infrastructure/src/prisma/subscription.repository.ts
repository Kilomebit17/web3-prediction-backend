import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { SubscriptionCategory } from '@prisma/client';

export interface SubDTO {
  id: string;
  category: string;
  name: string;
  description: string;
  isVipOnly: boolean;
  isPermanent: boolean;
  badge: string | null;
  accentColor: string | null;
  burnPercent: number;
  isActive: boolean;
  sortOrder: number;
  tiers: SubTierDTO[];
}

export interface SubTierDTO {
  id: string;
  subscriptionId: string;
  durationDays: number | null;
  price: string;
  burnAmount: string;
  label: string;
}

export interface UserSubDTO {
  id: string;
  userId: string;
  subscriptionId: string;
  tierId: string;
  isActive: boolean;
  activatedAt: Date;
  expiresAt: Date | null;
}

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string): Promise<SubDTO[]> {
    const where = category ? { category: category as SubscriptionCategory, isActive: true } : { isActive: true };
    const rows = await this.prisma.subscription.findMany({
      where,
      include: { tiers: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((s) => ({
      id: s.id, category: s.category, name: s.name, description: s.description,
      isVipOnly: s.isVipOnly, isPermanent: s.isPermanent, badge: s.badge,
      accentColor: s.accentColor, burnPercent: s.burnPercent, isActive: s.isActive,
      sortOrder: s.sortOrder,
      tiers: s.tiers.map((t) => ({
        id: t.id, subscriptionId: t.subscriptionId,
        durationDays: t.durationDays, price: t.price.toFixed(4),
        burnAmount: t.burnAmount.toFixed(4), label: t.label,
      })),
    }));
  }

  async findById(id: string): Promise<SubDTO | null> {
    const row = await this.prisma.subscription.findUnique({ where: { id }, include: { tiers: true } });
    if (!row) return null;
    return {
      id: row.id, category: row.category, name: row.name, description: row.description,
      isVipOnly: row.isVipOnly, isPermanent: row.isPermanent, badge: row.badge,
      accentColor: row.accentColor, burnPercent: row.burnPercent, isActive: row.isActive,
      sortOrder: row.sortOrder,
      tiers: row.tiers.map((t) => ({
        id: t.id, subscriptionId: t.subscriptionId,
        durationDays: t.durationDays, price: t.price.toFixed(4),
        burnAmount: t.burnAmount.toFixed(4), label: t.label,
      })),
    };
  }

  async getUserActiveSubscriptions(userId: string): Promise<UserSubDTO[]> {
    const rows = await this.prisma.userSubscription.findMany({
      where: { userId, isActive: true },
      include: { tier: true },
    });
    return rows.map((us) => ({
      id: us.id, userId: us.userId, subscriptionId: us.subscriptionId,
      tierId: us.tierId, isActive: us.isActive,
      activatedAt: us.activatedAt, expiresAt: us.expiresAt,
    }));
  }

  async hasActiveSubscription(userId: string, subscriptionId: string): Promise<boolean> {
    const row = await this.prisma.userSubscription.findFirst({
      where: { userId, subscriptionId, isActive: true },
    });
    return row !== null;
  }

  async createUserSubscription(params: {
    userId: string; subscriptionId: string; tierId: string; durationDays: number | null;
  }): Promise<UserSubDTO> {
    const expiresAt = params.durationDays
      ? new Date(Date.now() + params.durationDays * 86400 * 1000)
      : null;
    const row = await this.prisma.userSubscription.create({
      data: {
        userId: params.userId, subscriptionId: params.subscriptionId,
        tierId: params.tierId, isActive: true, expiresAt,
      },
    });
    return { id: row.id, userId: row.userId, subscriptionId: row.subscriptionId,
      tierId: row.tierId, isActive: row.isActive, activatedAt: row.activatedAt, expiresAt };
  }

  async deactivateUserSubscription(userSubId: string): Promise<void> {
    await this.prisma.userSubscription.update({
      where: { id: userSubId },
      data: { isActive: false },
    });
  }

  async findExpiredActiveSubscriptions(): Promise<UserSubDTO[]> {
    const rows = await this.prisma.userSubscription.findMany({
      where: { isActive: true, expiresAt: { lte: new Date() } },
    });
    return rows.map((us) => ({
      id: us.id, userId: us.userId, subscriptionId: us.subscriptionId,
      tierId: us.tierId, isActive: us.isActive,
      activatedAt: us.activatedAt, expiresAt: us.expiresAt,
    }));
  }
}
