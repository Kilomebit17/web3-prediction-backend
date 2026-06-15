import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Leaderboard rank IDs used by the application (matching get-leaderboard.use-case.ts)
const RANK_IDS = ['j1', 'e2', 's3', 'u4', 's5'];

async function deleteByPattern(redis, pattern) {
  let deleted = 0;
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = parseInt(nextCursor, 10);
    if (keys.length > 0) {
      await redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== 0);
  return deleted;
}

async function main() {
  console.log(`Connecting to Redis at ${REDIS_URL}...`);
  const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 1 });

  try {
    // 1. Clear all leaderboard sorted sets
    console.log('Clearing leaderboard sorted sets...');
    for (const rankId of RANK_IDS) {
      const key = `leaderboard:${rankId}:score`;
      const count = await redis.zcard(key);
      if (count > 0) {
        await redis.del(key);
        console.log(`  Deleted ${key} (${count} entries)`);
      } else {
        console.log(`  ${key} — empty, skipped`);
      }
    }

    // 2. Clear all user rank keys (user:*:rank)
    console.log('Clearing user rank keys...');
    const rankKeysDeleted = await deleteByPattern(redis, 'user:*:rank');
    console.log(`  Deleted ${rankKeysDeleted} user rank key(s)`);

    // 3. Clear all user member keys (user:*:member)
    console.log('Clearing user member keys...');
    const memberKeysDeleted = await deleteByPattern(redis, 'user:*:member');
    console.log(`  Deleted ${memberKeysDeleted} user member key(s)`);

    // 4. Clear any other leaderboard-related keys
    console.log('Clearing any remaining leaderboard-related keys...');
    const otherDeleted = await deleteByPattern(redis, 'leaderboard:*');
    console.log(`  Deleted ${otherDeleted} additional leaderboard key(s)`);

    console.log('\n✅ Redis leaderboard data cleared.');
  } finally {
    await redis.quit();
  }
}

main().catch((e) => {
  console.error('Redis reset failed:', e.message);
  process.exit(1);
});
