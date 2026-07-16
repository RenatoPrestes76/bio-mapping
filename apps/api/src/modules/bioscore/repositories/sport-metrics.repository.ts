import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class SportMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.sportMetrics.create({ data });
  }

  async findById(id: string) {
    return this.prisma.sportMetrics.findUnique({ where: { id } });
  }

  async findAll(patientId: string, sport?: string, limit = 30) {
    return this.prisma.sportMetrics.findMany({
      where: { patientId, ...(sport ? { sport: sport as any } : {}) },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  async findRecent(patientId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.sportMetrics.findMany({
      where: { patientId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
