import 'reflect-metadata';
import pino from 'pino';
import { BullMqService } from '@pred/infrastructure';
import { startPricePoller } from './processors/price-poller.processor';
import { startCandlePoller } from './processors/candle-poller.processor';
import { startBetResolveProcessor } from './processors/bet-resolve.processor';
import { runExpireSubscriptions } from './schedules/expire-subs.job';
import { runReconciliation } from './schedules/reconciliation.job';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['*.botToken', '*.password', '*.secret'],
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

async function bootstrap(): Promise<void> {
  logger.info('Pred.game worker process starting...');

  const bullMq = new BullMqService();

  // Phase 1.11: Price & candle pollers
  await startPricePoller(bullMq);
  logger.info('Price poller started (every 1s)');

  await startCandlePoller(bullMq);
  logger.info('Candle poller started (every 10s)');

  // Phase 1.13: Bet resolve processor
  await startBetResolveProcessor(bullMq);
  logger.info('Bet resolve processor started (concurrency 20)');

  // Schedule jobs
  setInterval(() => {
    runExpireSubscriptions().catch((err) => logger.error({ err }, 'Expire subscriptions failed'));
  }, 60_000);
  logger.info('Expire subscriptions scheduled (every 60s)');

  setInterval(() => {
    runReconciliation().catch((err) => logger.error({ err }, 'Reconciliation failed'));
  }, 300_000);
  logger.info('Reconciliation scheduled (every 5min)');

  logger.info('Worker ready');
}

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in worker');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('Worker received SIGTERM — shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Worker received SIGINT — shutting down gracefully');
  process.exit(0);
});

bootstrap();
