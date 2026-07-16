import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class NormalizedHealthDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(records: Array<{
    rawDataId?: string;
    patientId: string;
    metricType: OracleMetricType;
    value: number;
    unit: string;
    recordedAt: Date;
    source: HealthPlatform;
    qualifier?: string;
    isDuplicate?: boolean;
    isValid?: boolean;
    validationErrors?: string[];
  }>) {
    return this.prisma.normalizedHealthData.createMany({ data: records });
  }

  async findTimeline(
    patientId: string,
    metricTypes: OracleMetricType[],
    since: Date,
    until: Date,
    onlyValid = true,
  ) {
    return this.prisma.normalizedHealthData.findMany({
      where: {
        patientId,
        metricType: { in: metricTypes },
        recordedAt: { gte: since, lte: until },
        ...(onlyValid ? { isValid: true, isDuplicate: false } : {}),
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  async findExistingKeys(
    patientId: string,
    since: Date,
    until: Date,
  ) {
    return this.prisma.normalizedHealthData.findMany({
      where: { patientId, recordedAt: { gte: since, lte: until } },
      select: { source: true, metricType: true, recordedAt: true },
    });
  }

  async countByPatient(patientId: string) {
    return this.prisma.normalizedHealthData.count({ where: { patientId, isValid: true, isDuplicate: false } });
  }

  async latestByMetric(patientId: string, metricType: OracleMetricType) {
    return this.prisma.normalizedHealthData.findFirst({
      where: { patientId, metricType, isValid: true, isDuplicate: false },
      orderBy: { recordedAt: 'desc' },
    });
  }
}
