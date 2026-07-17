import { Injectable } from '@nestjs/common';
import { Prisma } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class SyncLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async log(jobId: string, level: 'INFO' | 'WARN' | 'ERROR', message: string, metadata?: Record<string, unknown>) {
    return this.prisma.syncLog.create({
      data: { jobId, level, message, metadata: metadata as Prisma.InputJsonValue | undefined },
    });
  }

  async findByJob(jobId: string) {
    return this.prisma.syncLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
