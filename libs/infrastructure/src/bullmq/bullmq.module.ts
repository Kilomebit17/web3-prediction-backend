import { Module } from '@nestjs/common';
import { BullMqService } from './bullmq.service';

@Module({
  providers: [BullMqService],
  exports: [BullMqService],
})
export class BullMqModule {}
