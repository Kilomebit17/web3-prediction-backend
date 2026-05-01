import { Injectable } from '@nestjs/common';
import type { IUnitOfWork } from '@pred/application';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  withTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }
}
