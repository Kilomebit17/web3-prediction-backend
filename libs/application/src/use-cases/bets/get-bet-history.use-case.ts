import { Injectable, Inject } from '@nestjs/common';
import {
  BET_REPOSITORY,
  USER_REPOSITORY,
  CACHE_PROVIDER,
  type IBetRepository,
  type IUserRepository,
  type ICacheProvider,
} from '../../ports';
import type { BetDTO } from './place-bet.use-case';
import { toBetDto } from './cancel-bet.use-case';
import { GetLeaderboardUseCase } from '../leaderboard/get-leaderboard.use-case';

export interface BetHistoryQuery {
  userId: string;
  cursor?: string;
  limit?: number;
  coinId?: string;
  status?: string;
}

export interface BetStatsSummary {
  totalBets: number;
  totalWon: number;
  totalLost: number;
  totalCancelled: number;
  totalVolume: string;
  totalNetWin: string;
  bestMultiplier: number;
  accuracy: string;
  bestWinStreak: number;
  score: string;
  totalLosses: number;
  totalWins: number;
  percentile: number | null;
}

@Injectable()
export class GetBetHistoryUseCase {
  constructor(
    @Inject(BET_REPOSITORY) private readonly betRepo: IBetRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async getActive(userId: string): Promise<BetDTO[]> {
    const bets = await this.betRepo.findActiveByUserId(userId);
    return bets.map((b) => toBetDto(b));
  }

  async getHistory(query: BetHistoryQuery): Promise<{ data: BetDTO[]; nextCursor: string | null }> {
    const result = await this.betRepo.findHistoryByUserId(query.userId, {
      cursor: query.cursor,
      limit: Math.min(100, query.limit ?? 20),
      coinId: query.coinId,
      status: query.status,
    });
    return { data: result.data.map((b) => toBetDto(b)), nextCursor: result.nextCursor };
  }

  async getById(userId: string, betId: string): Promise<BetDTO> {
    const bet = await this.betRepo.findById(betId);
    if (!bet || bet.userId !== userId) {
      throw Object.assign(new Error('Bet not found'), { code: 'NOT_FOUND' });
    }
    return toBetDto(bet);
  }

  async getStats(userId: string): Promise<BetStatsSummary> {
    const user = await this.userRepo.findById(userId);
    const stats = user?.stats;
    if (!stats)
      return {
        totalBets: 0,
        totalWon: 0,
        totalLost: 0,
        totalCancelled: 0,
        totalVolume: '0',
        totalNetWin: '0',
        bestMultiplier: 0,
        accuracy: '0',
        bestWinStreak: 0,
        score: '0',
        totalLosses: 0,
        totalWins: 0,
        percentile: null,
      };

    const totalBets = stats.totalWins + stats.totalLosses;
    const accuracy =
      totalBets >= 5 ? ((stats.totalWins / totalBets) * 100).toFixed(1) + '%' : 'N/A (min 5 bets)';

    const percentile = await this.computePercentile(userId);

    return {
      totalBets,
      totalWon: stats.totalWins,
      totalLost: stats.totalLosses,
      totalCancelled: 0,
      totalVolume: '0',
      totalNetWin: '0',
      bestMultiplier: stats.bestWinStreak,
      accuracy,
      bestWinStreak: stats.bestWinStreak,
      score: stats.score.toString(),
      totalLosses: stats.totalLosses,
      totalWins: stats.totalWins,
      percentile,
    };
  }

  private async computePercentile(userId: string): Promise<number | null> {
    try {
      const userRankId = await this.cache.get<string>(`user:${userId}:rank`);
      if (!userRankId) return null;

      const rankIds = GetLeaderboardUseCase.rankIds();
      const counts: Record<string, number> = {};
      let totalUsers = 0;
      for (const rid of rankIds) {
        const count = await this.cache.zcard(`leaderboard:${rid}:score`);
        counts[rid] = count;
        totalUsers += count;
      }
      if (totalUsers === 0) return null;

      const member = await this.cache.get<string>(`user:${userId}:member`);
      if (!member) return null;

      const userRank = await this.cache.zrevrank(`leaderboard:${userRankId}:score`, member);
      if (userRank === null) return null;

      const ranks = GetLeaderboardUseCase.getRanks();
      const userTierOrder = ranks.find((r) => r.id === userRankId)?.tierOrder ?? 1;

      let usersAbove = 0;
      for (const r of ranks) {
        if (r.tierOrder > userTierOrder) {
          usersAbove += counts[r.id] ?? 0;
        }
      }

      const globalPosition = usersAbove + userRank + 1;
      return Math.round((globalPosition / totalUsers) * 100 * 100) / 100;
    } catch {
      return null;
    }
  }
}
