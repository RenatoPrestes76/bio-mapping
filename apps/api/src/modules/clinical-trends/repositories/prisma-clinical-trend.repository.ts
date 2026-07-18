import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalTrend, TrendStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import {
  CreateTrendData,
  IClinicalTrendRepository,
  TrendFilters,
} from '../interfaces/clinical-trend-repository.interface.js';

@Injectable()
export class PrismaClinicalTrendRepository implements IClinicalTrendRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTrendData): Promise<ClinicalTrend> {
    return this.prisma.clinicalTrend.create({
      data: {
        patientId: data.patientId,
        tenantId: data.tenantId,
        metric: data.metric,
        trendType: data.trendType,
        direction: data.direction,
        status: data.status ?? TrendStatus.ACTIVE,
        startDate: data.startDate,
        endDate: data.endDate,
        confidence: data.confidence,
        sourceModule: data.sourceModule,
        summary: data.summary,
        metadata: data.metadata as object | undefined,
        createdBy: data.createdBy,
      },
    });
  }

  async findByPatient(patientId: string, filters: TrendFilters = {}): Promise<ClinicalTrend[]> {
    const { metric, status, trendType, limit = 50, offset = 0 } = filters;
    return this.prisma.clinicalTrend.findMany({
      where: {
        patientId,
        ...(metric && { metric }),
        ...(status && { status }),
        ...(trendType && { trendType }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async findActive(patientId?: string): Promise<ClinicalTrend[]> {
    return this.prisma.clinicalTrend.findMany({
      where: {
        status: TrendStatus.ACTIVE,
        ...(patientId && { patientId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByMetric(patientId: string, metric: string): Promise<ClinicalTrend | null> {
    return this.prisma.clinicalTrend.findFirst({
      where: { patientId, metric, status: TrendStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<ClinicalTrend | null> {
    return this.prisma.clinicalTrend.findUnique({ where: { id } });
  }

  async archive(id: string, updatedBy?: string): Promise<ClinicalTrend> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Clinical trend ${id} not found`);
    return this.prisma.clinicalTrend.update({
      where: { id },
      data: { status: TrendStatus.ARCHIVED, createdBy: updatedBy ?? existing.createdBy },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.clinicalTrend.delete({ where: { id } });
  }
}
