import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class DailyMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(patientId: string, date: Date, data: Partial<{
    steps: number;
    calories: number;
    sleepMinutes: number;
    avgHeartRate: number;
    minHeartRate: number;
    maxHeartRate: number;
    restingHr: number;
    hrv: number;
    spo2: number;
    weight: number;
    bodyFat: number;
    temperature: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    syncCount: number;
  }>) {
    return this.prisma.dailyMetrics.upsert({
      where: { patientId_date: { patientId, date } },
      create: { patientId, date, ...data },
      update: { ...data, computedAt: new Date() },
    });
  }

  async findRange(patientId: string, days: number, until?: Date) {
    const end = until ?? new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return this.prisma.dailyMetrics.findMany({
      where: { patientId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
  }

  async findByDate(patientId: string, date: Date) {
    return this.prisma.dailyMetrics.findUnique({
      where: { patientId_date: { patientId, date } },
    });
  }

  async findLatest(patientId: string) {
    return this.prisma.dailyMetrics.findFirst({
      where: { patientId },
      orderBy: { date: 'desc' },
    });
  }

  async findAllPatientsWithData(since: Date) {
    const rows = await this.prisma.dailyMetrics.findMany({
      where: { date: { gte: since } },
      select: { patientId: true },
      distinct: ['patientId'],
    });
    return rows.map((r) => r.patientId);
  }
}
