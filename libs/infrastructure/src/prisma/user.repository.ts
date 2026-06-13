import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { IUserRepository } from '@pred/application';
import {
  User,
  Money,
  TelegramUserId,
  ReferralCode,
  WalletAddress,
  type Chain,
  type UserRole,
  type UserStatus,
  type TelegramProfile,
  type UserStats,
  type Wallet,
} from '@pred/domain';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      include: { wallets: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByTelegramId(telegramId: bigint): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { telegramId },
      include: { wallets: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByReferralCode(code: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { referralCode: code },
      include: { wallets: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { username },
      include: { wallets: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: this.toPrismaCreate(user),
      update: this.toPrismaUpdate(user),
    });
  }

  async create(user: User): Promise<void> {
    await this.prisma.user.create({ data: this.toPrismaCreate(user) });
  }

  async update(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: this.toPrismaUpdate(user),
    });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      include: { wallets: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async countByReferrerId(referrerId: string): Promise<number> {
    return this.prisma.user.count({ where: { referredById: referrerId } });
  }

  // ── Mapping ──────────────────────────────────────────────────────────────

  private toDomain(
    row: Prisma.UserGetPayload<{ include: { wallets: true } }>,
  ): User {
    const profile: TelegramProfile = {
      username: row.telegramUsername,
      firstName: row.firstName,
      lastName: row.lastName,
      languageCode: row.languageCode,
      isPremium: row.isPremium,
      photoUrl: row.photoUrl,
      allowsWriteToPm: row.allowsWriteToPm,
    };

    const stats: UserStats = {
      totalWins: row.totalWins,
      totalLosses: row.totalLosses,
      bestWinStreak: row.bestWinStreak,
      score: row.score,
    };

    const wallets: Wallet[] = (row.wallets ?? []).map((w) => ({
      id: w.id,
      userId: w.userId,
      address: WalletAddress.of(w.address, w.chain as Chain),
      isVerified: true,
      createdAt: w.createdAt,
    }));

    return new User(
      row.id,
      TelegramUserId.of(row.telegramId),
      profile,
      row.username,
      Money.fromPred(row.balance.toFixed(4)),
      stats,
      ReferralCode.parse(row.referralCode),
      row.referredById,
      row.role as UserRole,
      row.status as UserStatus,
      wallets,
      row.createdAt,
      row.updatedAt,
      row.lastLoginAt,
    );
  }

  private toPrismaCreate(user: User): Prisma.UserCreateInput {
    return {
      id: user.id,
      telegramId: user.telegramId.value,
      telegramUsername: user.telegramProfile.username,
      firstName: user.telegramProfile.firstName,
      lastName: user.telegramProfile.lastName,
      languageCode: user.telegramProfile.languageCode,
      isPremium: user.telegramProfile.isPremium,
      photoUrl: user.telegramProfile.photoUrl,
      allowsWriteToPm: user.telegramProfile.allowsWriteToPm,
      username: user.username,
      balance: new Prisma.Decimal(user.balance.toString()),
      totalWins: user.stats.totalWins,
      totalLosses: user.stats.totalLosses,
      bestWinStreak: user.stats.bestWinStreak,
      score: user.stats.score,
      referralCode: user.referralCode.value,
      referredBy: user.referredById ? { connect: { id: user.referredById } } : undefined,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private toPrismaUpdate(user: User): Prisma.UserUpdateInput {
    return {
      telegramUsername: user.telegramProfile.username,
      firstName: user.telegramProfile.firstName,
      lastName: user.telegramProfile.lastName,
      languageCode: user.telegramProfile.languageCode,
      isPremium: user.telegramProfile.isPremium,
      photoUrl: user.telegramProfile.photoUrl,
      allowsWriteToPm: user.telegramProfile.allowsWriteToPm,
      username: user.username,
      balance: new Prisma.Decimal(user.balance.toString()),
      totalWins: user.stats.totalWins,
      totalLosses: user.stats.totalLosses,
      bestWinStreak: user.stats.bestWinStreak,
      score: user.stats.score,
      role: user.role,
      status: user.status,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
