import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class SleepMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: {
    patientId: string;
    date: Date;
    bedtime?: Date;
    wakeTime?: Date;
    totalMinutes?: number;
    deepMinutes?: number;
    remMinutes?: number;
    lightMinutes?: number;
    awakeMinutes?: number;
    efficiency?: number;
    sleepDebtMin?: number;
    classification?: string;
    source?: string;
    score?: number;
  }) {
    return this.prisma.sleepMetrics.upsert({
      where: { patientId_date: { patientId: data.patientId, date: data.date } },
      create: data as any,
      update: data as any,
    });
  }

  async findById(id: string) {
    return this.prisma.sleepMetrics.findUnique({ where: { id } });
  }

  async findAll(patientId: string, limit = 30) {
    return this.prisma.sleepMetrics.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async findRecent(patientId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.sleepMetrics.findMany({
      where: { patientId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
  }

  async delete(id: string) {
    return this.prisma.sleepMetrics.delete({ where: { id } });
  }
}
