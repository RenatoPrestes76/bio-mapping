import { Injectable } from '@nestjs/common';
import { OracleMetricType } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { DailyMetricsRepository } from '../repositories/daily-metrics.repository.js';

function avg(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function sum(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.round(values.reduce((a, b) => a + b, 0));
}

function min(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.min(...values);
}

function max(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.max(...values);
}

function last<T>(values: T[]): T | undefined {
  return values.length ? values[values.length - 1] : undefined;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setUTCHours(23, 59, 59, 999);
  return r;
}

@Injectable()
export class DailyMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: DailyMetricsRepository,
  ) {}

  async aggregateForDate(patientId: string, date: Date) {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const records = await this.prisma.normalizedHealthData.findMany({
      where: {
        patientId,
        recordedAt: { gte: start, lte: end },
        isValid: true,
        isDuplicate: false,
      },
    });

    const byType: Partial<Record<OracleMetricType, number[]>> = {};
    for (const r of records) {
      const t = r.metricType as OracleMetricType;
      if (!byType[t]) byType[t] = [];
      byType[t]!.push(r.value);
    }

    const hrValues = byType[OracleMetricType.HEART_RATE] ?? [];
    // Resting HR proxy: the lowest 10th-percentile of HR readings
    const sortedHr = [...hrValues].sort((a, b) => a - b);
    const restingHrValues = sortedHr.slice(0, Math.max(1, Math.floor(sortedHr.length * 0.1)));
    const restingHr = avg(restingHrValues);

    const metrics = {
      steps: sum(byType[OracleMetricType.STEPS] ?? []),
      calories: sum(byType[OracleMetricType.CALORIES] ?? []),
      sleepMinutes: sum(byType[OracleMetricType.SLEEP] ?? []),
      avgHeartRate: avg(hrValues),
      minHeartRate: min(hrValues),
      maxHeartRate: max(hrValues),
      restingHr,
      hrv: avg(byType[OracleMetricType.HRV] ?? []),
      spo2: avg(byType[OracleMetricType.SPO2] ?? []),
      weight: last(byType[OracleMetricType.WEIGHT] ?? []),
      bodyFat: last(byType[OracleMetricType.BODY_FAT] ?? []),
      temperature: avg(byType[OracleMetricType.TEMPERATURE] ?? []),
      bloodPressureSystolic: avg(byType[OracleMetricType.BLOOD_PRESSURE] ?? []),
      syncCount: records.length,
    };

    // Filter undefined values before upsert
    const defined = Object.fromEntries(
      Object.entries(metrics).filter(([, v]) => v !== undefined),
    ) as Parameters<DailyMetricsRepository['upsert']>[2];

    return this.repo.upsert(patientId, startOfDay(date), defined);
  }

  async getRange(patientId: string, days: number) {
    return this.repo.findRange(patientId, days);
  }

  async getLatest(patientId: string) {
    return this.repo.findLatest(patientId);
  }
}
