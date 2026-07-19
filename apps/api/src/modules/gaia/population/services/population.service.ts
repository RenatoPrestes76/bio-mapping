import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service.js';
import { AuditLogService } from '../../../../common/audit/audit-log.service.js';
import { PopulationRepository } from '../repositories/population.repository.js';
import { evaluateCohortFilters, countMatchingPatients, groupBySegment, type PatientRecord } from '../engine/cohort-builder.js';
import { stratifyRiskDistribution, computeHighRiskPercentage, computeRiskTrend, type RiskLevel } from '../engine/risk-stratifier.js';
import { analyzeTrend, detectSignificantTrends, computePrevalence } from '../engine/trend-analyzer.js';
import { detectAlerts, type PopulationSnapshot } from '../engine/early-warning.js';
import { buildBenchmarkReport } from '../engine/benchmark-engine.js';
import { shouldSuppress, applyAggregationMinimum } from '../engine/privacy-layer.js';
import type { CreateCohortDto, CompareCohortsDto, PopulationQueryDto } from '../dto/population.dto.js';
import type { PopulationCohort } from '@bio/database';

@Injectable()
export class PopulationService {
  constructor(
    private readonly repository: PopulationRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  // ── Create Cohort ─────────────────────────────────────────────────────────

  async createCohort(dto: CreateCohortDto, userId: string): Promise<PopulationCohort> {
    const profiles = await this.prisma.patientProfile.findMany({
      where: { tenantId: dto.tenantId ?? undefined },
      select: {
        patientId: true, age: true, sex: true, bmi: true, smoking: true,
        alcohol: true, lifestyle: true, conditions: true, familyHistory: true, medications: true,
      },
    });

    const patients: PatientRecord[] = profiles.map((p) => ({
      patientId: p.patientId,
      age: p.age ?? undefined,
      sex: p.sex ?? undefined,
      bmi: p.bmi ?? undefined,
      smoking: p.smoking,
      alcohol: p.alcohol ?? undefined,
      lifestyle: p.lifestyle ?? undefined,
      conditions: (p.conditions as string[] | null) ?? [],
      familyHistory: (p.familyHistory as string[] | null) ?? [],
      medications: (p.medications as string[] | null) ?? [],
    }));

    const patientCount = countMatchingPatients(patients, dto.filters);

    const cohort = await this.repository.createCohort({
      tenantId: dto.tenantId,
      name: dto.name,
      description: dto.description,
      segment: dto.segment,
      filters: dto.filters as unknown as object,
      patientCount,
      createdBy: userId,
    });

    if (dto.filters.length > 0) {
      await this.repository.createCohortFilters(cohort.id, dto.filters);
    }

    const matchingPatientIds = patients
      .filter((p) => evaluateCohortFilters(p, dto.filters))
      .map((p) => p.patientId as string);

    if (matchingPatientIds.length > 0) {
      await this.repository.upsertCohortMembers(cohort.id, matchingPatientIds);
    }

    await this.audit.log('COHORT_CREATED', { userId, metadata: { cohortId: cohort.id, name: dto.name, patientCount } });
    return this.repository.updateCohortCount(cohort.id, patientCount);
  }

  // ── Get Cohort ────────────────────────────────────────────────────────────

  async getCohort(id: string): Promise<{ cohort: PopulationCohort; filters: Awaited<ReturnType<PopulationRepository['findFiltersByCohortId']>>; metrics: Awaited<ReturnType<PopulationRepository['findMetricsByCohort']>> }> {
    const cohort = await this.repository.findCohortById(id);
    if (!cohort) throw new NotFoundException(`Coorte ${id} não encontrada`);
    const [filters, metrics] = await Promise.all([
      this.repository.findFiltersByCohortId(id),
      this.repository.findMetricsByCohort(id),
    ]);
    return { cohort, filters, metrics };
  }

  // ── Compare Cohorts ───────────────────────────────────────────────────────

  async compareCohortsById(dto: CompareCohortsDto, userId: string) {
    const [cohortA, cohortB] = await Promise.all([
      this.repository.findCohortById(dto.cohortAId),
      this.repository.findCohortById(dto.cohortBId),
    ]);
    if (!cohortA) throw new NotFoundException(`Coorte A ${dto.cohortAId} não encontrada`);
    if (!cohortB) throw new NotFoundException(`Coorte B ${dto.cohortBId} não encontrada`);

    const [metricsA, metricsB] = await Promise.all([
      this.repository.findMetricsByCohort(dto.cohortAId),
      this.repository.findMetricsByCohort(dto.cohortBId),
    ]);

    const toMap = (metrics: typeof metricsA) =>
      Object.fromEntries(metrics.map((m) => [m.metricKey, m.value]));

    const report = buildBenchmarkReport(
      toMap(metricsA),
      toMap(metricsB),
      cohortA.patientCount,
      cohortB.patientCount,
      {},
      {},
    );

    const period = new Date().toISOString().slice(0, 7);
    await this.repository.createBenchmarkResults(
      dto.cohortAId,
      dto.cohortBId,
      cohortA.tenantId ?? undefined,
      report.entries.map((e) => ({
        benchmarkKey: e.key,
        valueA: e.valueA,
        valueB: e.valueB,
        difference: e.difference,
        percentDiff: e.percentDiff,
      })),
      period,
    );

    await this.audit.log('COHORT_COMPARED', {
      userId,
      metadata: { cohortAId: dto.cohortAId, cohortBId: dto.cohortBId },
    });

    return { cohortA, cohortB, report };
  }

  // ── Population Dashboard ──────────────────────────────────────────────────

  async getPopulationDashboard(query: PopulationQueryDto) {
    const profiles = await this.prisma.patientProfile.findMany({
      where: { tenantId: query.tenantId },
      select: { patientId: true, age: true, sex: true, bmi: true, smoking: true, alcohol: true, lifestyle: true, conditions: true, familyHistory: true, medications: true },
    });

    const riskRecords = await this.prisma.personalizedRisk.findMany({
      where: { patientId: { in: profiles.map((p) => p.patientId) } },
      distinct: ['patientId'],
      orderBy: { createdAt: 'desc' },
      select: { patientId: true, riskLevel: true, finalRiskScore: true },
    });

    const riskMap = new Map(riskRecords.map((r) => [r.patientId, r]));
    const patients: PatientRecord[] = profiles.map((p) => ({
      ...p,
      conditions: (p.conditions as string[] | null) ?? [],
      familyHistory: (p.familyHistory as string[] | null) ?? [],
      medications: (p.medications as string[] | null) ?? [],
      riskLevel: riskMap.get(p.patientId)?.riskLevel ?? undefined,
    }));

    const total = patients.length;
    const riskLevels = riskRecords.map((r) => r.riskLevel as RiskLevel).filter(Boolean);
    const riskDistribution = stratifyRiskDistribution(riskLevels);
    const segmentDistribution = groupBySegment(patients);
    const segmentCounts = Object.fromEntries(
      Object.entries(segmentDistribution).map(([k, v]) => [k, v.length]),
    );

    const ageCounts = patients.map((p) => p.age as number).filter((a) => a !== undefined);
    const sexCounts = {
      MALE: patients.filter((p) => (p.sex as string)?.toUpperCase() === 'MALE').length,
      FEMALE: patients.filter((p) => (p.sex as string)?.toUpperCase() === 'FEMALE').length,
      OTHER: patients.filter((p) => !['MALE', 'FEMALE'].includes((p.sex as string)?.toUpperCase() ?? '')).length,
    };

    const smokingPrevalence = applyAggregationMinimum(
      computePrevalence(patients.filter((p) => p.smoking).length, total),
      total,
    );

    await this.audit.log('POPULATION_DASHBOARD_ACCESSED', {
      userId: query.tenantId,
      metadata: { tenantId: query.tenantId, totalPatients: total },
    });

    return {
      totalPatients: total,
      riskDistribution,
      segmentCounts: applyAggregationMinimum(segmentCounts, total),
      sexDistribution: applyAggregationMinimum(sexCounts, total),
      meanAge: ageCounts.length > 0 ? parseFloat((ageCounts.reduce((s, v) => s + v, 0) / ageCounts.length).toFixed(1)) : null,
      smokingPrevalence,
      highRiskPercentage: applyAggregationMinimum(computeHighRiskPercentage(riskLevels), total),
    };
  }

  // ── Population Trends ─────────────────────────────────────────────────────

  async getPopulationTrends(query: PopulationQueryDto) {
    const trends = query.cohortId
      ? await this.repository.findTrendsByCohort(query.cohortId)
      : await this.repository.findTrendsByTenant(query.tenantId);

    const metrics = await this.repository.findMetricsByTenant(query.tenantId);
    const grouped: Record<string, number[]> = {};
    for (const m of metrics) {
      if (!grouped[m.metricKey]) grouped[m.metricKey] = [];
      grouped[m.metricKey].push(m.value);
    }

    const computed = detectSignificantTrends(
      Object.entries(grouped).map(([key, values]) => ({ key, values })),
    );

    return { stored: trends, computed };
  }

  // ── Population Risk ───────────────────────────────────────────────────────

  async getPopulationRisk(query: PopulationQueryDto) {
    const riskRecords = await this.prisma.personalizedRisk.findMany({
      where: {
        patientId: {
          in: (await this.prisma.patientProfile.findMany({
            where: { tenantId: query.tenantId },
            select: { patientId: true },
          })).map((p) => p.patientId),
        },
      },
      distinct: ['patientId'],
      orderBy: { createdAt: 'desc' },
      select: { patientId: true, riskLevel: true, finalRiskScore: true, createdAt: true },
    });

    const riskLevels = riskRecords.map((r) => r.riskLevel as RiskLevel).filter(Boolean);
    const distribution = stratifyRiskDistribution(riskLevels);
    const trend = computeRiskTrend(distribution.meanRisk, distribution.meanRisk);

    await this.audit.log('POPULATION_RISK_ANALYZED', {
      userId: query.tenantId,
      metadata: { tenantId: query.tenantId, total: riskLevels.length },
    });

    return { distribution, trend };
  }

  // ── Population Alerts ─────────────────────────────────────────────────────

  async getPopulationAlerts(tenantId: string) {
    return this.repository.findActiveAlerts(tenantId);
  }

  async acknowledgeAlert(alertId: string, userId: string) {
    await this.audit.log('POPULATION_ALERT_ACKNOWLEDGED', { userId, metadata: { alertId } });
    return this.repository.acknowledgeAlert(alertId, userId);
  }
}
