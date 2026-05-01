import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class ReferralRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: { referrerId: string; referredId: string }): Promise<void> {
    await this.prisma.referral.upsert({
      where: { referredId: params.referredId },
      create: { referrerId: params.referrerId, referredId: params.referredId },
      update: { referrerId: params.referrerId },
    });
  }

  async addEarned(referredId: string, amount: number): Promise<void> {
    await this.prisma.referral.update({
      where: { referredId },
      data: { totalEarned: { increment: amount } },
    });
  }

  async findByReferrerId(referrerId: string) {
    return this.prisma.referral.findMany({
      where: { referrerId },
      include: { referred: { select: { id: true, username: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTotalEarned(referrerId: string): Promise<number> {
    const result = await this.prisma.referral.aggregate({
      where: { referrerId },
      _sum: { totalEarned: true },
    });
    return result._sum.totalEarned?.toNumber() ?? 0;
  }
}
