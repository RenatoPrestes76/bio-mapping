import { Injectable } from '@nestjs/common';
import { InteropAdapter, InteropDirection, InteropJobStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class InteropJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId?: string;
    patientId?: string;
    direction: InteropDirection;
    adapter: InteropAdapter;
    sourceSystem?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.interopJob.create({ data: data as Parameters<typeof this.prisma.interopJob.create>[0]['data'] });
  }

  async start(id: string) {
    return this.prisma.interopJob.update({
      where: { id },
      data: { status: InteropJobStatus.RUNNING, startedAt: new Date() },
    });
  }

  async complete(id: string, stats: { totalRecords: number; processedRecords: number; failedRecords: number; conflictsFound: number }) {
    const status = stats.failedRecords > 0 && stats.processedRecords === 0
      ? InteropJobStatus.FAILED
      : stats.failedRecords > 0
        ? InteropJobStatus.PARTIAL
        : InteropJobStatus.COMPLETED;
    return this.prisma.interopJob.update({
      where: { id },
      data: { status, completedAt: new Date(), ...stats },
    });
  }

  async fail(id: string, errorMessage: string) {
    return this.prisma.interopJob.update({
      where: { id },
      data: { status: InteropJobStatus.FAILED, completedAt: new Date(), errorMessage },
    });
  }

  async addLog(jobId: string, level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
    return this.prisma.interopLog.create({ data: { jobId, level, message, metadata: meta } });
  }

  async findById(id: string) {
    return this.prisma.interopJob.findUnique({
      where: { id },
      include: { logs: { orderBy: { createdAt: 'asc' }, take: 100 } },
    });
  }

  async findByPatient(patientId: string, limit = 20) {
    return this.prisma.interopJob.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByOrganization(organizationId: string, limit = 50) {
    return this.prisma.interopJob.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
