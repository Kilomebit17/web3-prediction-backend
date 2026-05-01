import { Injectable, Inject } from '@nestjs/common';
import { SUB_REPOSITORY, type ISubscriptionRepo } from './purchase-subscription.use-case';

export interface SubCatalogDTO {
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
  tiers: SubTierCatalogDTO[];
}

export interface SubTierCatalogDTO {
  id: string;
  subscriptionId: string;
  durationDays: number | null;
  price: string;
  burnAmount: string;
  label: string;
}

export interface UserActiveSubDTO {
  id: string;
  userId: string;
  subscriptionId: string;
  tierId: string;
  isActive: boolean;
  activatedAt: Date;
  expiresAt: Date | null;
}

@Injectable()
export class GetSubscriptionsUseCase {
  constructor(
    @Inject(SUB_REPOSITORY) private readonly subRepo: ISubscriptionRepo,
  ) {}

  async executeAll(category?: string): Promise<SubCatalogDTO[]> {
    return this.subRepo.findAll(category) as Promise<SubCatalogDTO[]>;
  }

  async executeById(id: string): Promise<SubCatalogDTO | null> {
    const repo = this.subRepo as unknown as { findById(id: string): Promise<SubCatalogDTO | null> };
    return repo.findById(id);
  }

  async executeUserActive(userId: string): Promise<UserActiveSubDTO[]> {
    return this.subRepo.getUserActiveSubscriptions(userId) as Promise<UserActiveSubDTO[]>;
  }
}
