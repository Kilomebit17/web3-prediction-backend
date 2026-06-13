import type { User } from '@pred/domain';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByTelegramId(telegramId: bigint): Promise<User | null>;
  findByReferralCode(code: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  save(user: User): Promise<void>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
  findByIds(ids: string[]): Promise<User[]>;
  countByReferrerId(referrerId: string): Promise<number>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
