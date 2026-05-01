import type { Transaction } from '@pred/domain';

export const TRANSACTION_REPOSITORY = Symbol('ITransactionRepository');

export interface ITransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByIdempotencyKey(key: string): Promise<Transaction | null>;
  findByUserId(
    userId: string,
    params: { cursor?: string; limit: number },
  ): Promise<{ data: Transaction[]; nextCursor: string | null }>;
  save(transaction: Transaction): Promise<void>;
  create(transaction: Transaction): Promise<void>;
}
