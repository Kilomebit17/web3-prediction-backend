import { Injectable, Inject } from '@nestjs/common';
import { CACHE_PROVIDER, type ICacheProvider } from '../../ports';
import { GetLeaderboardUseCase } from './get-leaderboard.use-case';

interface ILeaderboardSnapshotRepo {
  createSnapshot(params: {
    userId: string;
    period: string;
    position: number;
    score: bigint;
    balance: string;
  }): Promise<void>;
}

export const LEADERBOARD_SNAPSHOT_REPO = Symbol('ILeaderboardSnapshotRepo');

@Injectable()
export class SnapshotLeaderboardUseCase {
  constructor(
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    @Inject(LEADERBOARD_SNAPSHOT_REPO) private readonly snapshotRepo: ILeaderboardSnapshotRepo,
  ) {}

  async execute(): Promise<void> {
    for (const rankId of GetLeaderboardUseCase.rankIds()) {
      const key = `leaderboard:${rankId}:score`;
      const members = await this.cache.zrevrange(key, 0, 99);
      for (let i = 0; i < members.length; i++) {
        const parts = members[i]?.split(':') ?? [];
        const userId = parts[0];
        const score = parts[2];
        if (userId && score) {
          await this.snapshotRepo.createSnapshot({
            userId, period: rankId, position: i + 1,
            score: BigInt(score), balance: parts[3] ?? '0',
          });
        }
      }
    }
  }
}