import { Injectable } from '@nestjs/common';
import { InsightPriority, RecommendationStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(patientId: string, data: {
    insightId?: string;
    priority: InsightPriority;
    title: string;
    description: string;
    rationale: string;
    metrics: string[];
    action: string;
  }) {
    return this.prisma.recommendation.create({
      data: {
        patientId,
        ...data,
        metrics: data.metrics as unknown as import('@bio/database').Prisma.InputJsonValue,
      },
    });
  }

  async findByStatus(patientId: string, status?: RecommendationStatus) {
    return this.prisma.recommendation.findMany({
      where: { patientId, ...(status ? { status } : {}) },
      orderBy: { generatedAt: 'desc' },
      take: 50,
    });
  }

  async findHistory(patientId: string, limit = 30) {
    return this.prisma.recommendation.findMany({
      where: { patientId, status: { not: RecommendationStatus.PENDING } },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });
  }

  async updateStatus(id: string, status: RecommendationStatus) {
    const now = new Date();
    const timestamps: { acceptedAt?: Date; ignoredAt?: Date; completedAt?: Date } = {};
    if (status === RecommendationStatus.ACCEPTED) timestamps.acceptedAt = now;
    if (status === RecommendationStatus.IGNORED) timestamps.ignoredAt = now;
    if (status === RecommendationStatus.COMPLETED) timestamps.completedAt = now;
    return this.prisma.recommendation.update({
      where: { id },
      data: { status, ...timestamps },
    });
  }

  async existsPending(patientId: string, title: string): Promise<boolean> {
    const count = await this.prisma.recommendation.count({
      where: { patientId, title, status: RecommendationStatus.PENDING },
    });
    return count > 0;
  }
}
