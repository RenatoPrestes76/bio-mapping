import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalTrend, TrendStatus } from '@bio/database';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { ALL_METRICS, METRIC_RULE_MAP, METRIC_TRIGGER_FIELD_MAP, METRICS } from '../constants/metrics.constants.js';
import { DataPoint, IClinicalTrendAnalyzer } from '../interfaces/clinical-trend-analyzer.interface.js';
import { TrendFilters } from '../interfaces/clinical-trend-repository.interface.js';
import { PrismaClinicalTrendRepository } from '../repositories/prisma-clinical-trend.repository.js';
import {
  BloodPressureAnalyzer,
  BmiAnalyzer,
  CardiovascularRiskAnalyzer,
  GlycemicAnalyzer,
  LipidProfileAnalyzer,
} from '../analyzers/index.js';
import { AnalyzeTrendsDto } from '../dto/analyze-trends.dto.js';

@Injectable()
export class ClinicalTrendsService {
  private readonly analyzers: IClinicalTrendAnalyzer[];

  constructor(
    private readonly repo: PrismaClinicalTrendRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {
    this.analyzers = [
      new BloodPressureAnalyzer(),
      new GlycemicAnalyzer(),
      new LipidProfileAnalyzer(),
      new BmiAnalyzer(),
      new CardiovascularRiskAnalyzer(),
    ];
  }

  async analyze(dto: AnalyzeTrendsDto, userId?: string): Promise<ClinicalTrend[]> {
    const { patientId, metrics } = dto;
    const targetMetrics = metrics?.length ? metrics : ALL_METRICS;
    const targetAnalyzers = this.analyzers.filter((a) => targetMetrics.includes(a.metric));

    const results: ClinicalTrend[] = [];

    for (const analyzer of targetAnalyzers) {
      const dataPoints = await this.fetchDataPoints(patientId, analyzer.metric);
      const result = analyzer.analyze({ patientId, dataPoints });
      const trendData = analyzer.buildTrend(patientId, result, userId);
      const trend = await this.repo.create(trendData);
      results.push(trend);
    }

    await this.audit.log('TREND_ANALYZED', {
      userId,
      metadata: { patientId, metrics: targetAnalyzers.map((a) => a.metric), count: results.length },
    });

    return results;
  }

  async recalculate(patientId: string, metric: string, userId?: string): Promise<ClinicalTrend> {
    const existing = await this.repo.findByMetric(patientId, metric);
    if (existing) {
      await this.repo.archive(existing.id, userId);
    }

    const analyzer = this.analyzers.find((a) => a.supports(metric));
    if (!analyzer) throw new NotFoundException(`No analyzer found for metric: ${metric}`);

    const dataPoints = await this.fetchDataPoints(patientId, metric);
    const result = analyzer.analyze({ patientId, dataPoints });
    const trendData = analyzer.buildTrend(patientId, result, userId);
    const trend = await this.repo.create(trendData);

    await this.audit.log('TREND_RECALCULATED', { userId, metadata: { patientId, metric } });
    return trend;
  }

  async findByPatient(patientId: string, filters: TrendFilters = {}): Promise<ClinicalTrend[]> {
    return this.repo.findByPatient(patientId, filters);
  }

  async findById(id: string): Promise<ClinicalTrend> {
    const trend = await this.repo.findById(id);
    if (!trend) throw new NotFoundException(`Clinical trend ${id} not found`);
    return trend;
  }

  async findActive(patientId?: string): Promise<ClinicalTrend[]> {
    return this.repo.findActive(patientId);
  }

  async archive(id: string, userId?: string): Promise<ClinicalTrend> {
    const trend = await this.repo.archive(id, userId);
    await this.audit.log('TREND_ARCHIVED', { userId, metadata: { id, metric: trend.metric } });
    return trend;
  }

  private async fetchDataPoints(patientId: string, metric: string): Promise<DataPoint[]> {
    if (metric === METRICS.CARDIOVASCULAR_RISK) {
      return this.fetchCardiovascularRiskPoints(patientId);
    }

    const ruleId = METRIC_RULE_MAP[metric];
    const field = METRIC_TRIGGER_FIELD_MAP[metric];
    if (!ruleId || !field) return [];

    const decisions = await this.prisma.clinicalDecision.findMany({
      where: { patientId, ruleId },
      orderBy: { createdAt: 'asc' },
      select: { triggerData: true, createdAt: true },
    });

    return decisions
      .filter((d) => d.triggerData && typeof (d.triggerData as Record<string, unknown>)[field] === 'number')
      .map((d) => ({
        value: (d.triggerData as Record<string, number>)[field],
        timestamp: d.createdAt,
      }));
  }

  private async fetchCardiovascularRiskPoints(patientId: string): Promise<DataPoint[]> {
    const decisions = await this.prisma.clinicalDecision.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' },
      select: { priority: true, createdAt: true },
    });

    const byDay = new Map<string, { score: number; date: Date }>();
    for (const d of decisions) {
      const day = d.createdAt.toISOString().split('T')[0];
      const score = d.priority === 'CRITICAL' ? 3 : d.priority === 'HIGH' ? 2 : 1;
      const existing = byDay.get(day) ?? { score: 0, date: d.createdAt };
      byDay.set(day, { score: existing.score + score, date: existing.date });
    }

    return Array.from(byDay.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ score, date }) => ({ value: score, timestamp: date }));
  }
}
