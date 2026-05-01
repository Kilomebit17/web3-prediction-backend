import { randomUUID } from 'crypto';
import { DomainError } from '../errors/domain.error';
import type { Money } from '../value-objects/money.vo';
import type { ReferralCode } from '../value-objects/referral-code.vo';
import type { TelegramUserId } from '../value-objects/telegram-user-id.vo';
import type { WalletAddress } from '../value-objects/wallet-address.vo';
import { Transaction, type TransactionType } from './transaction.entity';

export type UserRole = 'user' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'banned' | 'frozen';

export interface TelegramProfile {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isPremium: boolean;
  photoUrl: string | null;
  allowsWriteToPm: boolean;
}

export interface UserStats {
  totalWins: number;
  totalLosses: number;
  bestWinStreak: number;
  score: bigint;
}

export interface Wallet {
  id: string;
  userId: string;
  address: WalletAddress;
  isVerified: boolean;
  createdAt: Date;
}

export interface TransactionReference {
  referenceType: string;
  referenceId: string;
}

export class User {
  constructor(
    public readonly id: string,
    public readonly telegramId: TelegramUserId,
    public telegramProfile: TelegramProfile,
    public username: string | null,
    public balance: Money,
    public stats: UserStats,
    public readonly referralCode: ReferralCode,
    public readonly referredById: string | null,
    public role: UserRole,
    public status: UserStatus,
    public readonly wallets: Wallet[],
    public readonly createdAt: Date,
    public updatedAt: Date,
    public lastLoginAt: Date | null,
  ) {}

  debit(amount: Money, reason: TransactionType, ref?: TransactionReference): Transaction {
    const newBalance = this.balance.sub(amount); // throws InsufficientBalanceError
    this.balance = newBalance;
    this.updatedAt = new Date();
    return new Transaction(
      randomUUID(),
      this.id,
      reason,
      amount.neg(),
      newBalance,
      ref?.referenceType ?? null,
      ref?.referenceId ?? null,
      null,
      {},
      new Date(),
    );
  }

  credit(amount: Money, reason: TransactionType, ref?: TransactionReference): Transaction {
    this.balance = this.balance.add(amount);
    this.updatedAt = new Date();
    return new Transaction(
      randomUUID(),
      this.id,
      reason,
      amount,
      this.balance,
      ref?.referenceType ?? null,
      ref?.referenceId ?? null,
      null,
      {},
      new Date(),
    );
  }

  updateTelegramProfile(profile: TelegramProfile): void {
    this.telegramProfile = profile;
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  changeUsername(newUsername: string): void {
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(newUsername)) {
      throw new DomainError('INVALID_USERNAME', 'Username must be 3-32 alphanumeric characters');
    }
    this.username = newUsername;
    this.updatedAt = new Date();
  }

  linkWallet(wallet: Wallet): void {
    const duplicate = this.wallets.some(
      (w) => w.address.address === wallet.address.address && w.address.chain === wallet.address.chain,
    );
    if (duplicate) {
      throw new DomainError('DUPLICATE_WALLET', `Wallet already linked: ${wallet.address.address}`);
    }
    this.wallets.push(wallet);
    this.updatedAt = new Date();
  }

  ban(): void {
    this.status = 'banned';
    this.updatedAt = new Date();
  }

  unban(): void {
    this.status = 'active';
    this.updatedAt = new Date();
  }
}
