import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class BioScoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    patientId: string;
    periodStart: Date;
    periodEnd: Date;
    healthScore: number;
    recoveryScore: number;
    cardioScore: number;
    bodyScore: number;
    sleepScore: number;
    activityScore: number;
    consistencyScore: number;
    metadata?: unknown;
  }) {
    return this.prisma.bioScore.create({ data: data as any });
  }

  async findLatest(patientId: string) {
    return this.prisma.bioScore.findFirst({
      where: { patientId },
      orderBy: { calculatedAt: 'desc' },
    });
  }

  async findAll(patientId: string, limit = 30) {
    return this.prisma.bioScore.findMany({
      where: { patientId },
      orderBy: { calculatedAt: 'desc' },
      take: limit,
    });
  }
}
