import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class RecoveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.recoveryMetrics.create({ data });
  }

  async findLatest(patientId: string) {
    return this.prisma.recoveryMetrics.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async findAll(patientId: string, limit = 30) {
    return this.prisma.recoveryMetrics.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  async findRecent(patientId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.recoveryMetrics.findMany({
      where: { patientId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
