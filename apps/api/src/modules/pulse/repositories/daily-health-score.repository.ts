import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class DailyHealthScoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(patientId: string, date: Date, data: {
    overall: number;
    sleepScore?: number;
    stepsScore?: number;
    exerciseScore?: number;
    hrScore?: number;
    recoveryScore?: number;
    hydrationScore?: number;
  }) {
    return this.prisma.dailyHealthScore.upsert({
      where: { patientId_date: { patientId, date } },
      create: { patientId, date, ...data },
      update: { ...data, computedAt: new Date() },
    });
  }

  async findRange(patientId: string, days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return this.prisma.dailyHealthScore.findMany({
      where: { patientId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
  }

  async findLatest(patientId: string) {
    return this.prisma.dailyHealthScore.findFirst({
      where: { patientId },
      orderBy: { date: 'desc' },
    });
  }
}
