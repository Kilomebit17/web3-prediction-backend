import { PrismaService } from '@pred/infrastructure';

export async function runReconciliation(): Promise<void> {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  try {
    // Sum all transactions per user, compare with user.balance
    const mismatches = await prisma.$queryRawUnsafe<Array<{ user_id: string; balance: number; tx_sum: number; diff: number }>>(
      `SELECT 
        u.id as user_id,
        u.balance,
        COALESCE(t.tx_sum, 0) as tx_sum,
        u.balance - COALESCE(t.tx_sum, 0) as diff
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(amount) as tx_sum
        FROM transactions
        GROUP BY user_id
      ) t ON t.user_id = u.id
      WHERE u.balance != COALESCE(t.tx_sum, 0)
      LIMIT 100`,
    );

    if (mismatches.length > 0) {
      console.error(
        `[RECONCILIATION] Found ${mismatches.length} balance mismatches:`,
        mismatches.map((m) => ({ user: m.user_id, diff: m.diff })),
      );
    }
  } catch (err) {
    console.error('[RECONCILIATION] Error:', err);
  } finally {
    await prisma.onModuleDestroy();
  }
}
