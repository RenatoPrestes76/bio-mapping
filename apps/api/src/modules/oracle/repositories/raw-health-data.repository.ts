import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType, Prisma } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class RawHealthDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(records: Array<{
    sourceId: string;
    patientId: string;
    platform: HealthPlatform;
    metricType: OracleMetricType;
    rawPayload: Record<string, unknown>;
    recordedAt: Date;
  }>) {
    return this.prisma.rawHealthData.createMany({
      data: records.map((r) => ({ ...r, rawPayload: r.rawPayload as Prisma.InputJsonValue })),
    });
  }

  async findUnprocessed(sourceId: string, limit = 500) {
    return this.prisma.rawHealthData.findMany({
      where: { sourceId, isProcessed: false },
      orderBy: { recordedAt: 'asc' },
      take: limit,
    });
  }

  async markProcessed(ids: string[]) {
    return this.prisma.rawHealthData.updateMany({
      where: { id: { in: ids } },
      data: { isProcessed: true },
    });
  }

  async countBySource(sourceId: string) {
    return this.prisma.rawHealthData.count({ where: { sourceId } });
  }
}
