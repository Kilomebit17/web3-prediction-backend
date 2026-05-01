import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type JobsOptions } from 'bullmq';

export type QueueName =
  | 'bet-resolve'
  | 'price-poller'
  | 'candle-poller';

@Injectable()
export class BullMqService implements OnModuleDestroy {
  private queues = new Map<string, Queue>();
  private readonly redisUrl: string;

  constructor() {
    this.redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  }

  getQueue(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      const connection = { url: this.redisUrl };
      this.queues.set(
        name,
        new Queue(name, { connection }),
      );
    }
    const queue = this.queues.get(name);
    if (!queue) throw new Error(`Queue ${name} not initialized`);
    return queue;
  }

  addJob<T>(
    queueName: QueueName,
    jobName: string,
    data: T,
    opts?: JobsOptions,
  ): Promise<{ id?: string }> {
    const queue = this.getQueue(queueName);
    return queue.add(jobName, data, opts);
  }

  createWorker<T>(
    queueName: QueueName,
    processor: (job: { data: T }) => Promise<void>,
    concurrency = 1,
  ): Worker<T> {
    const connection = { url: this.redisUrl };
    return new Worker<T>(queueName, processor, {
      connection,
      concurrency,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });
  }

  async onModuleDestroy(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}
