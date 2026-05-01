import { RedisCacheService } from '@pred/infrastructure';
import { SnapshotLeaderboardUseCase } from '@pred/application';

export async function runLeaderboardSnapshot(): Promise<void> {
  const redis = new RedisCacheService();
  redis.onModuleInit();
  try {
    const stubRepo = { createSnapshot: async () => undefined };
    const uc = new SnapshotLeaderboardUseCase(redis, stubRepo);
    await uc.execute('all');
    await uc.execute('weekly');
  } finally {
    await redis.onModuleDestroy();
  }
}
