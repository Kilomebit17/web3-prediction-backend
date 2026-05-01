import { Injectable, Inject } from '@nestjs/common';
import { CACHE_PROVIDER, type ICacheProvider } from '../../ports';

export interface LeaderboardEntry {
  userId: string;
  username: string | null;
  score: string;
  balance: string;
  position: number;
}

@Injectable()
export class GetLeaderboardUseCase {
  constructor(
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async execute(period: string, limit: number): Promise<LeaderboardEntry[]> {
    const key = `leaderboard:score:${period}`;
    const members = await this.cache.zrevrange(key, 0, limit - 1);
    return members.map((member, idx) => {
      const parts = member.split(':');
      return {
        userId: parts[0] ?? '',
        username: parts[1] || null,
        score: parts[2] ?? '0',
        balance: parts[3] ?? '0',
        position: idx + 1,
      };
    });
  }

  async getUserPosition(userId: string, period: string): Promise<{
    entry: LeaderboardEntry | null;
    neighbors: LeaderboardEntry[];
  }> {
    const key = `leaderboard:score:${period}`;
    const members = await this.cache.zrevrange(key, 0, -1);
    const idx = members.findIndex((m) => m.startsWith(`${userId}:`));
    if (idx === -1) return { entry: null, neighbors: [] };

    const entryParts = members[idx]?.split(':') ?? [];
    const entry: LeaderboardEntry = {
      userId: entryParts[0] ?? '',
      username: entryParts[1] || null,
      score: entryParts[2] ?? '0',
      balance: entryParts[3] ?? '0',
      position: idx + 1,
    };

    const neighbors: LeaderboardEntry[] = [];
    for (let i = Math.max(0, idx - 2); i <= Math.min(members.length - 1, idx + 2); i++) {
      if (i === idx) continue;
      const parts = members[i]?.split(':') ?? [];
      neighbors.push({
        userId: parts[0] ?? '',
        username: parts[1] || null,
        score: parts[2] ?? '0',
        balance: parts[3] ?? '0',
        position: i + 1,
      });
    }
    return { entry, neighbors };
  }
}
