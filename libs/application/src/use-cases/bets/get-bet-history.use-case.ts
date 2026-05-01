import { Injectable, Inject } from '@nestjs/common';
import {
  BET_REPOSITORY, USER_REPOSITORY,
  type IBetRepository, type IUserRepository,
} from '../../ports';
import type { BetDTO } from './place-bet.use-case';
import { toBetDto } from './cancel-bet.use-case';

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
}

@Injectable()
export class GetBetHistoryUseCase {
  constructor(
    @Inject(BET_REPOSITORY) private readonly betRepo: IBetRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
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
    if (!stats) return { totalBets: 0, totalWon: 0, totalLost: 0, totalCancelled: 0, totalVolume: '0', totalNetWin: '0', bestMultiplier: 0, accuracy: '0' };

    const totalBets = stats.totalWins + stats.totalLosses;
    const accuracy = totalBets >= 5
      ? ((stats.totalWins / totalBets) * 100).toFixed(1) + '%'
      : 'N/A (min 5 bets)';

    return {
      totalBets,
      totalWon: stats.totalWins,
      totalLost: stats.totalLosses,
      totalCancelled: 0,
      totalVolume: '0',
      totalNetWin: '0',
      bestMultiplier: stats.bestWinStreak,
      accuracy,
    };
  }
}
