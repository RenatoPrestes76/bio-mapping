import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class TrendAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(data: any[]) {
    return this.prisma.$transaction(
      data.map((d) =>
        this.prisma.trendAnalysis.create({ data: d }),
      ),
    );
  }

  async findAll(patientId: string) {
    return this.prisma.trendAnalysis.findMany({
      where: { patientId },
      orderBy: { periodStart: 'desc' },
    });
  }

  async findByMetric(patientId: string, metric: string) {
    return this.prisma.trendAnalysis.findMany({
      where: { patientId, metric },
      orderBy: { periodStart: 'asc' },
    });
  }
}
