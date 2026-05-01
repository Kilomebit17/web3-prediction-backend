import type { Money } from '../value-objects/money.vo';

export type TransactionType =
  | 'bet_placed'
  | 'bet_won'
  | 'bet_refund'
  | 'subscription_purchase'
  | 'deposit'
  | 'withdrawal'
  | 'referral_bonus'
  | 'airdrop'
  | 'admin_adjustment';

// Immutable ledger entry — never mutated after creation
export class Transaction {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: TransactionType,
    public readonly amount: Money,         // signed: negative for debits, positive for credits
    public readonly balanceAfter: Money,
    public readonly referenceType: string | null,
    public readonly referenceId: string | null,
    public readonly idempotencyKey: string | null,
    public readonly metadata: Record<string, unknown>,
    public readonly createdAt: Date,
  ) {}
}
