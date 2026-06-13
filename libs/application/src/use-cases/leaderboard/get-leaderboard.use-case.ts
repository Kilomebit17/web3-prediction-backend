import { Injectable, Inject } from '@nestjs/common';
import { RankCalculator, Money } from '@pred/domain';
import type { Rank } from '@pred/domain';
import { CACHE_PROVIDER, type ICacheProvider } from '../../ports';

export interface LeaderboardEntry {
  userId: string;
  username: string | null;
  score: string;
  balance: string;
  position: number;
  rankId: string;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const RANKS: Rank[] = [
  { id: 'j1', name: 'J-1', minBalance: Money.fromPred(0), tierOrder: 1 },
  { id: 'e2', name: 'E-2', minBalance: Money.fromPred(1000), tierOrder: 2 },
  { id: 's3', name: 'S-3', minBalance: Money.fromPred(100000), tierOrder: 3 },
  { id: 'u4', name: 'U-4', minBalance: Money.fromPred(1000000), tierOrder: 4 },
  { id: 's5', name: 'S-5', minBalance: Money.fromPred(3000000), tierOrder: 5 },
];

const RANK_IDS = RANKS.map((r) => r.id);
const rankCalculator = new RankCalculator(RANKS);

function leaderboardKey(rankId: string): string {
  return `leaderboard:${rankId}:score`;
}

function userRankKey(userId: string): string {
  return `user:${userId}:rank`;
}

@Injectable()
export class GetLeaderboardUseCase {
  constructor(
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async getPage(category: string, page: number, pageSize: number): Promise<LeaderboardPage> {
    const rankId = this.resolveCategory(category);
    const key = leaderboardKey(rankId);
    const start = (page - 1) * pageSize;
    const stop = start + pageSize - 1;

    const [members, total] = await Promise.all([
      this.cache.zrevrange(key, start, stop),
      this.cache.zcard(key),
    ]);

    const entries = members.map((member, idx) => {
      const parts = member.split(':');
      return {
        userId: parts[0] ?? '',
        username: parts[1] || null,
        score: parts[2] ?? '0',
        balance: parts[3] ?? '0',
        position: start + idx + 1,
        rankId,
      };
    });

    return { entries, total, page, pageSize };
  }

  async getUserPosition(userId: string): Promise<{
    entry: LeaderboardEntry | null;
    rankId: string;
    neighbors: LeaderboardEntry[];
  } | null> {
    const cachedRankId = await this.cache.get<string>(userRankKey(userId));
    if (!cachedRankId) return null;

    const key = leaderboardKey(cachedRankId);
    const member = await this.cache.get<string>(`user:${userId}:member`);
    if (!member) return null;

    const position = await this.cache.zrevrank(key, member);
    if (position === null) return null;

    const idx = position;

    const parts = member.split(':');
    const entry: LeaderboardEntry = {
      userId: parts[0] ?? '',
      username: parts[1] || null,
      score: parts[2] ?? '0',
      balance: parts[3] ?? '0',
      position: idx + 1,
      rankId: cachedRankId,
    };

    const neighbors: LeaderboardEntry[] = [];
    const start = Math.max(0, idx - 2);
    const stop = idx + 2;
    const neighborMembers = await this.cache.zrevrange(key, start, stop);
    for (let i = 0; i < neighborMembers.length; i++) {
      if (start + i === idx) continue;
      const nParts = neighborMembers[i]?.split(':') ?? [];
      neighbors.push({
        userId: nParts[0] ?? '',
        username: nParts[1] || null,
        score: nParts[2] ?? '0',
        balance: nParts[3] ?? '0',
        position: start + i + 1,
        rankId: cachedRankId,
      });
    }
    return { entry, rankId: cachedRankId, neighbors };
  }

  private resolveCategory(category: string): string {
    const normalized = category.toLowerCase();
    if (RANK_IDS.includes(normalized)) return normalized;
    return 'j1';
  }

  // Static helpers used by other use-cases to update leaderboard
  static rankIds(): string[] {
    return [...RANK_IDS];
  }

  static getRanks(): { id: string; name: string; minBalance: string; tierOrder: number }[] {
    return RANKS.map((r) => ({ id: r.id, name: r.name, minBalance: r.minBalance.toString(), tierOrder: r.tierOrder }));
  }

  static calculateRank(balanceRaw: string): string {
    const balance = Money.fromPred(balanceRaw);
    const rank = rankCalculator.calculate(balance);
    return rank.id;
  }
}