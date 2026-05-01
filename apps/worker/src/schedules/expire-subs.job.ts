import { PrismaService, SubscriptionRepository } from '@pred/infrastructure';
import { ExpireSubscriptionsUseCase } from '@pred/application';

export async function runExpireSubscriptions(): Promise<void> {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  try {
    const repo = new SubscriptionRepository(prisma);
    const uc = new ExpireSubscriptionsUseCase(repo);
    const count = await uc.execute();
    if (count > 0) console.log(`[EXPIRE-SUBS] Deactivated ${count} expired subscriptions`);
  } finally {
    await prisma.onModuleDestroy();
  }
}
