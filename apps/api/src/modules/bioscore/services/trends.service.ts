import { Injectable } from '@nestjs/common';
import {
  computeTrend,
  isPersonalRecordHigh,
  isPersonalRecordLow,
} from '@bio/bioscore-engine';
import { TrendAnalysisRepository } from '../repositories/trend-analysis.repository.js';
import { PrismaService } from '../../../database/prisma.service.js';

const METRIC_CONFIG: Record<string, { label: string; higherIsBetter: boolean }> = {
  weight: { label: 'Peso', higherIsBetter: false },
  heartRate: { label: 'FC Repouso', higherIsBetter: false },
  vo2max: { label: 'VO₂ Máx', higherIsBetter: true },
  sleepHours: { label: 'Horas de Sono', higherIsBetter: true },
  recoveryScore: { label: 'Recovery Score', higherIsBetter: true },
  healthScore: { label: 'Health Score', higherIsBetter: true },
  bodyFatPct: { label: '% Gordura', higherIsBetter: false },
  weeklyDistanceM: { label: 'Distância Semanal', higherIsBetter: true },
};

@Injectable()
export class TrendsService {
  constructor(
    private readonly repo: TrendAnalysisRepository,
    private readonly prisma: PrismaService,
  ) {}

  async computeForPatient(patientId: string, period: 'WEEKLY' | 'MONTHLY' | 'ANNUAL' = 'WEEKLY') {
    const days = period === 'WEEKLY' ? 56 : period === 'MONTHLY' ? 180 : 365;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [vitals, sleep, recovery, bioScores] = await Promise.all([
      this.prisma.vitalRecord.findMany({
        where: { patientId, recordedAt: { gte: since }, deletedAt: null },
        orderBy: { recordedAt: 'asc' },
        select: { recordedAt: true, weight: true, heartRate: true },
      }),
      this.prisma.sleepMetrics.findMany({
        where: { patientId, date: { gte: since } },
        orderBy: { date: 'asc' },
        select: { date: true, totalMinutes: true, score: true },
      }),
      this.prisma.recoveryMetrics.findMany({
        where: { patientId, recordedAt: { gte: since } },
        orderBy: { recordedAt: 'asc' },
        select: { recordedAt: true, recoveryScore: true },
      }),
      this.prisma.bioScore.findMany({
        where: { patientId, calculatedAt: { gte: since } },
        orderBy: { calculatedAt: 'asc' },
        select: { calculatedAt: true, healthScore: true },
      }),
    ]);

    const analyses: any[] = [];

    const addTrend = (
      metric: string,
      values: number[],
      periodStart: Date,
      periodEnd: Date,
    ) => {
      if (values.length < 2) return;
      const cfg = METRIC_CONFIG[metric];
      if (!cfg) return;
      const report = computeTrend(values, cfg.higherIsBetter);
      const historicalExtremes = this.getHistoricalExtreme(values, cfg.higherIsBetter);
      const currentVal = values[values.length - 1];

      const isPR = cfg.higherIsBetter
        ? isPersonalRecordHigh(currentVal, historicalExtremes.max)
        : isPersonalRecordLow(currentVal, historicalExtremes.min);

      analyses.push({
        patientId,
        metric,
        period,
        periodStart,
        periodEnd,
        valueStart: values[0],
        valueEnd: currentVal,
        changePct: report.changePct,
        trend: report.trend,
        movingAverage: report.movingAvg,
        isPersonalRecord: isPR,
        isPlateauDetected: report.isPlateauDetected,
        regressionSlope: report.regressionSlope,
        dataPoints: values.length,
      });
    };

    const now = new Date();
    const periodStart = since;

    if (vitals.length >= 2) {
      const weights = vitals.filter((v) => v.weight != null).map((v) => v.weight!);
      const hrs = vitals.filter((v) => v.heartRate != null).map((v) => v.heartRate!);
      if (weights.length >= 2) addTrend('weight', weights, periodStart, now);
      if (hrs.length >= 2) addTrend('heartRate', hrs, periodStart, now);
    }

    if (sleep.length >= 2) {
      const hours = sleep.map((s) => (s.totalMinutes ?? 0) / 60);
      addTrend('sleepHours', hours, periodStart, now);
    }

    if (recovery.length >= 2) {
      const scores = recovery.map((r) => r.recoveryScore);
      addTrend('recoveryScore', scores, periodStart, now);
    }

    if (bioScores.length >= 2) {
      const scores = bioScores.map((b) => b.healthScore);
      addTrend('healthScore', scores, periodStart, now);
    }

    if (analyses.length > 0) {
      await this.repo.upsertMany(analyses);
    }

    return analyses;
  }

  async findAll(patientId: string) {
    return this.repo.findAll(patientId);
  }

  async findByMetric(patientId: string, metric: string) {
    return this.repo.findByMetric(patientId, metric);
  }

  private getHistoricalExtreme(values: number[], higherIsBetter: boolean) {
    return {
      max: Math.max(...values),
      min: Math.min(...values),
    };
  }
}
