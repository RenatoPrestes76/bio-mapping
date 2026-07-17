import { Injectable } from '@nestjs/common';
import { DailyMetricsRepository } from '../repositories/daily-metrics.repository.js';

export type TrendPeriod = '7d' | '30d' | '90d' | '1y';
export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

export interface MetricTrend {
  metric: string;
  period: TrendPeriod;
  startValue: number | null;
  endValue: number | null;
  changePct: number | null;
  direction: TrendDirection;
  average: number | null;
  dataPoints: number;
}

const PERIOD_DAYS: Record<TrendPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

const STABLE_THRESHOLD = 0.03; // <3% change = STABLE

type MetricKey = 'weight' | 'avgHeartRate' | 'steps' | 'sleepMinutes' | 'calories' | 'hrv' | 'spo2' | 'bodyFat';

const METRIC_KEYS: MetricKey[] = [
  'weight', 'avgHeartRate', 'steps', 'sleepMinutes', 'calories', 'hrv', 'spo2', 'bodyFat',
];

@Injectable()
export class TrendsService {
  constructor(private readonly metricsRepo: DailyMetricsRepository) {}

  async computeTrends(patientId: string, periods: TrendPeriod[] = ['7d', '30d', '90d', '1y']): Promise<MetricTrend[]> {
    const results: MetricTrend[] = [];

    for (const period of periods) {
      const days = PERIOD_DAYS[period];
      const data = await this.metricsRepo.findRange(patientId, days);
      if (data.length < 2) continue;

      for (const key of METRIC_KEYS) {
        const values = data.map((d) => d[key] as number | null).filter((v): v is number => v !== null);
        if (values.length < 2) continue;

        const startValue = values[0];
        const endValue = values[values.length - 1];
        const changePct = startValue !== 0 ? ((endValue - startValue) / startValue) * 100 : null;
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        const direction = this.getDirection(changePct);

        results.push({
          metric: key,
          period,
          startValue,
          endValue,
          changePct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
          direction,
          average: Math.round(average * 10) / 10,
          dataPoints: values.length,
        });
      }
    }

    return results;
  }

  async computeForMetric(patientId: string, metric: MetricKey, period: TrendPeriod): Promise<MetricTrend | null> {
    const days = PERIOD_DAYS[period];
    const data = await this.metricsRepo.findRange(patientId, days);
    const values = data.map((d) => d[metric] as number | null).filter((v): v is number => v !== null);

    if (values.length < 2) return null;

    const startValue = values[0];
    const endValue = values[values.length - 1];
    const changePct = startValue !== 0 ? ((endValue - startValue) / startValue) * 100 : null;
    const average = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      metric,
      period,
      startValue,
      endValue,
      changePct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
      direction: this.getDirection(changePct),
      average: Math.round(average * 10) / 10,
      dataPoints: values.length,
    };
  }

  private getDirection(changePct: number | null): TrendDirection {
    if (changePct === null) return 'STABLE';
    if (Math.abs(changePct) / 100 < STABLE_THRESHOLD) return 'STABLE';
    return changePct > 0 ? 'UP' : 'DOWN';
  }
}
