import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleSyncStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class SyncJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    sourceId: string;
    patientId: string;
    platform: HealthPlatform;
  }) {
    return this.prisma.syncJob.create({
      data: { ...data, status: OracleSyncStatus.PENDING },
    });
  }

  async start(id: string) {
    return this.prisma.syncJob.update({
      where: { id },
      data: { status: OracleSyncStatus.RUNNING, startedAt: new Date() },
    });
  }

  async complete(id: string, counts: { rawRecordsCount: number; normalizedCount: number; errorCount: number }) {
    return this.prisma.syncJob.update({
      where: { id },
      data: { ...counts, status: OracleSyncStatus.COMPLETED, completedAt: new Date() },
    });
  }

  async fail(id: string, errorMessage: string, partial = false) {
    return this.prisma.syncJob.update({
      where: { id },
      data: {
        status: partial ? OracleSyncStatus.PARTIAL : OracleSyncStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
      },
    });
  }

  async findByPatient(patientId: string, limit = 20) {
    return this.prisma.syncJob.findMany({
      where: { patientId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async findBySource(sourceId: string, limit = 10) {
    return this.prisma.syncJob.findMany({
      where: { sourceId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
