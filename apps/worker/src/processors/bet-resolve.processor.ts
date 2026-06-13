import { BullMqService } from '@pred/infrastructure';
import {
  PrismaService,
  UserRepository,
  BetRepository,
  TransactionRepository,
  CoinRepository,
  BinancePriceProvider,
  InMemoryEventBus,
} from '@pred/infrastructure';
import { ResolveBetUseCase } from '@pred/application';

export async function startBetResolveProcessor(bullMq: BullMqService): Promise<void> {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const userRepo = new UserRepository(prisma);
  const betRepo = new BetRepository(prisma);
  const txRepo = new TransactionRepository(prisma);
  const coinRepo = new CoinRepository(prisma);
  const priceProvider = new BinancePriceProvider(coinRepo);
  const eventBus = new InMemoryEventBus();

  const resolveUseCase = new ResolveBetUseCase(
    betRepo,
    userRepo,
    txRepo,
    { withTransaction: <T>(work: () => Promise<T>) => prisma.$transaction(work as any) as Promise<T> },
    eventBus,
    priceProvider,
  );

  // Crash-safety: recover stale active bets on startup (ROADMAP 8.3)
  const staleBets = await betRepo.findExpiredActive(new Date());
  for (const bet of staleBets) {
    await bullMq.addJob('bet-resolve', 'resolve', { betId: bet.id });
  }

  const processor = async (job: { data: { betId: string } }): Promise<void> => {
    try {
      await resolveUseCase.execute({ betId: job.data.betId });
    } catch {
      // Retry by throwing (BullMQ handles retry backoff)
      throw new Error(`Failed to resolve bet ${job.data.betId}`);
    }
  };

  const worker = bullMq.createWorker('bet-resolve', processor, 20);

  process.on('SIGTERM', async () => {
    await worker.close();
    await prisma.onModuleDestroy();
  });
}
