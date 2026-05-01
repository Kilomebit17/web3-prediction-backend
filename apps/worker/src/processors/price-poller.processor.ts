import { BullMqService } from '@pred/infrastructure';
import { BinancePriceProvider, CoinRepository, PrismaService, RedisCacheService } from '@pred/infrastructure';

export async function startPricePoller(bullMq: BullMqService): Promise<void> {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const redis = new RedisCacheService();
  redis.onModuleInit();

  const coinRepo = new CoinRepository(prisma);
  const priceProvider = new BinancePriceProvider(coinRepo);

  const worker = bullMq.createWorker('price-poller', async () => {
    try {
      const coins = await coinRepo.findActive();
      for (const coin of coins) {
        try {
          const price = await priceProvider.getCurrent(coin.id);
          await redis.set(
            `price:${coin.id}:latest`,
            JSON.stringify({
              price: price.toString(),
              ts: Date.now(),
            }),
            10, // TTL 10s — refetched every second
          );
        } catch {
          // Skip failed coins, retry next tick
        }
      }
    } catch {
      // Log and continue
    }
  }, 1);

  // Schedule repeat every 1s
  await bullMq.getQueue('price-poller').add('poll', {}, {
    repeat: { every: 1000 },
    removeOnComplete: true,
    removeOnFail: true,
  });

  // Clean up on shutdown
  process.on('SIGTERM', async () => {
    await worker.close();
    await redis.onModuleDestroy();
    await prisma.onModuleDestroy();
  });
}
