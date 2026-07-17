import { Injectable } from '@nestjs/common';
import { InsightCategory, InsightPriority } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class HealthInsightRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(patientId: string, data: {
    category: InsightCategory;
    priority: InsightPriority;
    insightType: string;
    title: string;
    message: string;
    metrics: string[];
    algorithm: string;
    modelVersion?: string;
    dataWindow: number;
    expiresAt?: Date;
  }) {
    return this.prisma.healthInsight.create({
      data: {
        patientId,
        ...data,
        metrics: data.metrics as unknown as import('@bio/database').Prisma.InputJsonValue,
        modelVersion: data.modelVersion ?? '1.0.0',
      },
    });
  }

  async findRecent(patientId: string, limit = 20) {
    return this.prisma.healthInsight.findMany({
      where: { patientId, expiresAt: { gt: new Date() } },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });
  }

  async findByPriority(patientId: string, priorities: InsightPriority[]) {
    return this.prisma.healthInsight.findMany({
      where: { patientId, priority: { in: priorities }, expiresAt: { gt: new Date() } },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async existsToday(patientId: string, insightType: string): Promise<boolean> {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const count = await this.prisma.healthInsight.count({
      where: { patientId, insightType, generatedAt: { gte: since } },
    });
    return count > 0;
  }

  async markRead(id: string) {
    return this.prisma.healthInsight.update({ where: { id }, data: { isRead: true } });
  }

  async expireOld(patientId: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return this.prisma.healthInsight.deleteMany({
      where: { patientId, generatedAt: { lt: cutoff } },
    });
  }
}
