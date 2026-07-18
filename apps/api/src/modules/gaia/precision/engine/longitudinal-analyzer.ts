export interface DataPoint {
  value: number;
  recordedAt: Date;
  metricName: string;
}

export interface TrendResult {
  slope: number;
  direction: 'IMPROVING' | 'STABLE' | 'WORSENING';
  percentChange: number;
  dataPoints: number;
  firstValue: number;
  lastValue: number;
  average: number;
}

export interface LongitudinalSummary {
  metricName: string;
  trend: TrendResult;
  min: number;
  max: number;
  latest: number;
  latestDate: Date;
  significantChange: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeMovingAverage(values: number[], windowSize: number): number[] {
  if (values.length === 0 || windowSize <= 0) return [];
  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    return round2(window.reduce((s, v) => s + v, 0) / window.length);
  });
}

export function calculateLinearTrend(dataPoints: DataPoint[]): TrendResult {
  if (dataPoints.length === 0) {
    return { slope: 0, direction: 'STABLE', percentChange: 0, dataPoints: 0, firstValue: 0, lastValue: 0, average: 0 };
  }

  const sorted = [...dataPoints].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const values = sorted.map((d) => d.value);
  const n = values.length;

  if (n === 1) {
    return { slope: 0, direction: 'STABLE', percentChange: 0, dataPoints: 1, firstValue: values[0], lastValue: values[0], average: values[0] };
  }

  // Simple linear regression over index (not time) for stability
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);

  const slope = round2((n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX));
  const average = round2(sumY / n);
  const firstValue = values[0];
  const lastValue = values[n - 1];
  const percentChange = firstValue !== 0 ? round2(((lastValue - firstValue) / Math.abs(firstValue)) * 100) : 0;

  let direction: TrendResult['direction'];
  if (Math.abs(slope) < 0.01 * average) direction = 'STABLE';
  else if (slope > 0) direction = 'WORSENING';
  else direction = 'IMPROVING';

  return { slope, direction, percentChange, dataPoints: n, firstValue, lastValue, average };
}

export function detectSignificantChange(recentValues: number[], baselineValues: number[], threshold = 0.15): boolean {
  if (recentValues.length === 0 || baselineValues.length === 0) return false;
  const recentMean = recentValues.reduce((s, v) => s + v, 0) / recentValues.length;
  const baselineMean = baselineValues.reduce((s, v) => s + v, 0) / baselineValues.length;
  if (baselineMean === 0) return false;
  return Math.abs(recentMean - baselineMean) / Math.abs(baselineMean) > threshold;
}

export function summarizeLongitudinalData(dataPoints: DataPoint[]): LongitudinalSummary | null {
  if (dataPoints.length === 0) return null;

  const sorted = [...dataPoints].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const values = sorted.map((d) => d.value);
  const trend = calculateLinearTrend(sorted);

  const half = Math.floor(values.length / 2);
  const baseline = values.slice(0, half);
  const recent = values.slice(half);
  const significantChange = detectSignificantChange(recent, baseline);

  return {
    metricName: dataPoints[0].metricName,
    trend,
    min: round2(Math.min(...values)),
    max: round2(Math.max(...values)),
    latest: round2(sorted[sorted.length - 1].value),
    latestDate: sorted[sorted.length - 1].recordedAt,
    significantChange,
  };
}

export function groupMetricsByName(dataPoints: DataPoint[]): Record<string, DataPoint[]> {
  return dataPoints.reduce(
    (acc, dp) => {
      if (!acc[dp.metricName]) acc[dp.metricName] = [];
      acc[dp.metricName].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  );
}
