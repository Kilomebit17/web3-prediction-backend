import { BullMqService } from '@pred/infrastructure';
import { BinancePriceProvider, CoinRepository, PrismaService } from '@pred/infrastructure';

export async function startCandlePoller(bullMq: BullMqService): Promise<void> {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const coinRepo = new CoinRepository(prisma);
  const priceProvider = new BinancePriceProvider(coinRepo);

  const intervals = ['1m', '5m', '1h', '4h', '1d'] as const;

  const worker = bullMq.createWorker('candle-poller', async () => {
    try {
      const coins = await coinRepo.findActive();
      for (const coin of coins) {
        for (const interval of intervals) {
          try {
            const candles = await priceProvider.getCandles(coin.id, interval, 5);
            for (const c of candles) {
              await prisma.priceCandle.upsert({
                where: {
                  coinId_interval_openTime: {
                    coinId: coin.id,
                    interval,
                    openTime: c.openTime,
                  },
                },
                create: {
                  coinId: coin.id,
                  interval,
                  openTime: c.openTime,
                  open: c.open.toNumber(),
                  high: c.high.toNumber(),
                  low: c.low.toNumber(),
                  close: c.close.toNumber(),
                  volume: c.volume.toNumber(),
                  closeTime: c.closeTime,
                },
                update: {
                  open: c.open.toNumber(),
                  high: c.high.toNumber(),
                  low: c.low.toNumber(),
                  close: c.close.toNumber(),
                  volume: c.volume.toNumber(),
                  closeTime: c.closeTime,
                },
              });
            }
          } catch {
            // Skip failed, retry next cycle
          }
        }
      }
    } catch {
      // Log and continue
    }
  }, 1);

  // Schedule repeat every 10s
  await bullMq.getQueue('candle-poller').add('poll', {}, {
    repeat: { every: 10_000 },
    removeOnComplete: true,
    removeOnFail: true,
  });

  process.on('SIGTERM', async () => {
    await worker.close();
    await prisma.onModuleDestroy();
  });
}
