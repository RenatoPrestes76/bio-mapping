import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service.js';
import type {
  PopulationCohort,
  CohortFilter,
  CohortMember,
  PopulationMetric,
  PopulationTrend,
  PopulationAlert,
  BenchmarkResult,
  EpidemiologicalStatistic,
} from '@bio/database';

@Injectable()
export class PopulationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Cohorts ───────────────────────────────────────────────────────────────

  async createCohort(data: {
    tenantId?: string;
    name: string;
    description?: string;
    segment?: string;
    filters: object;
    patientCount: number;
    createdBy: string;
  }): Promise<PopulationCohort> {
    return this.prisma.populationCohort.create({ data: data as any });
  }

  async findCohortById(id: string): Promise<PopulationCohort | null> {
    return this.prisma.populationCohort.findUnique({ where: { id } });
  }

  async findCohortsByTenant(tenantId: string): Promise<PopulationCohort[]> {
    return this.prisma.populationCohort.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCohortCount(id: string, patientCount: number): Promise<PopulationCohort> {
    return this.prisma.populationCohort.update({ where: { id }, data: { patientCount, status: 'ACTIVE' } });
  }

  async updateCohort(id: string, data: Partial<{ name: string; description: string; status: string; filters: object }>): Promise<PopulationCohort> {
    return this.prisma.populationCohort.update({ where: { id }, data: data as any });
  }

  // ── Cohort Filters ────────────────────────────────────────────────────────

  async createCohortFilters(cohortId: string, filters: Array<{ filterKey: string; filterOperator: string; filterValue: string }>): Promise<CohortFilter[]> {
    await this.prisma.cohortFilter.createMany({
      data: filters.map((f) => ({ ...f, cohortId })),
    });
    return this.prisma.cohortFilter.findMany({ where: { cohortId } });
  }

  async findFiltersByCohortId(cohortId: string): Promise<CohortFilter[]> {
    return this.prisma.cohortFilter.findMany({ where: { cohortId } });
  }

  // ── Cohort Members ────────────────────────────────────────────────────────

  async upsertCohortMembers(cohortId: string, patientIds: string[]): Promise<void> {
    await this.prisma.cohortMember.createMany({
      data: patientIds.map((patientId) => ({ cohortId, patientId })),
      skipDuplicates: true,
    });
  }

  async findMembersByCohortId(cohortId: string): Promise<CohortMember[]> {
    return this.prisma.cohortMember.findMany({ where: { cohortId, leftAt: null } });
  }

  // ── Population Metrics ────────────────────────────────────────────────────

  async createMetric(data: {
    tenantId?: string;
    cohortId?: string;
    metricType: string;
    metricKey: string;
    value: number;
    unit?: string;
    periodStart: Date;
    periodEnd: Date;
    metadata?: object;
  }): Promise<PopulationMetric> {
    return this.prisma.populationMetric.create({ data: data as any });
  }

  async findMetricsByTenant(tenantId: string, metricKey?: string): Promise<PopulationMetric[]> {
    return this.prisma.populationMetric.findMany({
      where: { tenantId, ...(metricKey ? { metricKey } : {}) },
      orderBy: { computedAt: 'desc' },
    });
  }

  async findMetricsByCohort(cohortId: string): Promise<PopulationMetric[]> {
    return this.prisma.populationMetric.findMany({
      where: { cohortId },
      orderBy: { computedAt: 'desc' },
    });
  }

  // ── Population Trends ─────────────────────────────────────────────────────

  async createTrend(data: {
    tenantId?: string;
    cohortId?: string;
    metricKey: string;
    direction: string;
    changePercent: number;
    periodStart: Date;
    periodEnd: Date;
    isSignificant: boolean;
    confidence: number;
  }): Promise<PopulationTrend> {
    return this.prisma.populationTrend.create({ data: data as any });
  }

  async findTrendsByTenant(tenantId: string): Promise<PopulationTrend[]> {
    return this.prisma.populationTrend.findMany({
      where: { tenantId },
      orderBy: { computedAt: 'desc' },
    });
  }

  async findTrendsByCohort(cohortId: string): Promise<PopulationTrend[]> {
    return this.prisma.populationTrend.findMany({
      where: { cohortId },
      orderBy: { computedAt: 'desc' },
    });
  }

  // ── Population Alerts ─────────────────────────────────────────────────────

  async createAlert(data: {
    tenantId?: string;
    cohortId?: string;
    alertType: string;
    severity: string;
    title: string;
    description: string;
    metricKey?: string;
    currentValue?: number;
    previousValue?: number;
  }): Promise<PopulationAlert> {
    return this.prisma.populationAlert.create({ data: data as any });
  }

  async findActiveAlerts(tenantId: string): Promise<PopulationAlert[]> {
    return this.prisma.populationAlert.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acknowledgeAlert(id: string, userId: string): Promise<PopulationAlert> {
    return this.prisma.populationAlert.update({
      where: { id },
      data: { isActive: false, acknowledgedAt: new Date(), acknowledgedBy: userId },
    });
  }

  // ── Benchmark Results ─────────────────────────────────────────────────────

  async createBenchmarkResults(
    cohortAId: string,
    cohortBId: string | undefined,
    tenantId: string | undefined,
    entries: Array<{ benchmarkKey: string; valueA: number; valueB: number | null; difference: number | null; percentDiff: number | null }>,
    period: string,
  ): Promise<BenchmarkResult[]> {
    await this.prisma.benchmarkResult.createMany({
      data: entries.map((e) => ({
        tenantId,
        cohortAId,
        cohortBId,
        benchmarkKey: e.benchmarkKey,
        valueA: e.valueA,
        valueB: e.valueB ?? undefined,
        difference: e.difference ?? undefined,
        percentDiff: e.percentDiff ?? undefined,
        period,
      })),
    });
    return this.prisma.benchmarkResult.findMany({ where: { cohortAId }, orderBy: { computedAt: 'desc' } });
  }

  // ── Epidemiological Statistics ────────────────────────────────────────────

  async createStatistic(data: {
    tenantId?: string;
    cohortId?: string;
    statKey: string;
    statValue: number;
    unit?: string;
    confidenceInterval?: object;
    sampleSize: number;
    suppressed?: boolean;
  }): Promise<EpidemiologicalStatistic> {
    return this.prisma.epidemiologicalStatistic.create({ data: data as any });
  }

  async findStatisticsByCohort(cohortId: string): Promise<EpidemiologicalStatistic[]> {
    return this.prisma.epidemiologicalStatistic.findMany({
      where: { cohortId, suppressed: false },
      orderBy: { computedAt: 'desc' },
    });
  }
}
