import type { Bet } from '@pred/domain';

export const BET_REPOSITORY = Symbol('IBetRepository');

export interface IBetRepository {
  findById(id: string): Promise<Bet | null>;
  findActiveByUserId(userId: string): Promise<Bet[]>;
  findHistoryByUserId(
    userId: string,
    params: {
      cursor?: string;
      limit: number;
      coinId?: string;
      status?: string;
    },
  ): Promise<{ data: Bet[]; nextCursor: string | null }>;
  findExpiredActive(now: Date): Promise<Bet[]>;
  save(bet: Bet): Promise<void>;
  create(bet: Bet): Promise<void>;
  update(bet: Bet): Promise<void>;
}
