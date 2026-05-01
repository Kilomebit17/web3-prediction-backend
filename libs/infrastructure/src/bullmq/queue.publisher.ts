import { Injectable } from '@nestjs/common';
import type { IQueuePublisher } from '@pred/application';
import { BullMqService } from './bullmq.service';

@Injectable()
export class BullMqPublisher implements IQueuePublisher {
  constructor(private readonly bullMq: BullMqService) {}

  async scheduleBetResolution(betId: string, delaySeconds: number): Promise<void> {
    await this.bullMq.addJob(
      'bet-resolve',
      'resolve',
      { betId },
      { delay: delaySeconds * 1000, jobId: betId },
    );
  }
}
