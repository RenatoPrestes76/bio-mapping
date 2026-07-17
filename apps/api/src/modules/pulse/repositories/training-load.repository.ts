import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class TrainingLoadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(patientId: string, date: Date, data: {
    dailyLoad: number;
    weeklyLoad: number;
    monthlyLoad: number;
    atl: number;
    ctl: number;
    tsb: number;
  }) {
    return this.prisma.trainingLoad.upsert({
      where: { patientId_date: { patientId, date } },
      create: { patientId, date, ...data },
      update: { ...data, computedAt: new Date() },
    });
  }

  async findLatest(patientId: string) {
    return this.prisma.trainingLoad.findFirst({
      where: { patientId },
      orderBy: { date: 'desc' },
    });
  }

  async findRange(patientId: string, days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return this.prisma.trainingLoad.findMany({
      where: { patientId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
  }
}
