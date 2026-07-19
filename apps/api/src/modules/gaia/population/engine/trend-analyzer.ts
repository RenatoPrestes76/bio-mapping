export type TrendDirection = 'INCREASING' | 'DECREASING' | 'STABLE';

export interface TrendResult {
  direction: TrendDirection;
  slope: number;
  changePercent: number;
  isSignificant: boolean;
  confidence: number;
  firstValue: number;
  lastValue: number;
}

export function computeLinearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  const numerator = values.reduce((sum, y, i) => sum + (i - xMean) * (y - yMean), 0);
  const denominator = values.reduce((sum, _, i) => sum + Math.pow(i - xMean, 2), 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

export function classifyTrend(slope: number, baseline: number, significanceThreshold = 0.02): TrendDirection {
  if (baseline === 0) return slope === 0 ? 'STABLE' : slope > 0 ? 'INCREASING' : 'DECREASING';
  const relativeSlope = Math.abs(slope / baseline);
  if (relativeSlope < significanceThreshold) return 'STABLE';
  return slope > 0 ? 'INCREASING' : 'DECREASING';
}

export function analyzeTrend(values: number[]): TrendResult {
  if (values.length === 0) {
    return { direction: 'STABLE', slope: 0, changePercent: 0, isSignificant: false, confidence: 0, firstValue: 0, lastValue: 0 };
  }
  if (values.length === 1) {
    return { direction: 'STABLE', slope: 0, changePercent: 0, isSignificant: false, confidence: 0.5, firstValue: values[0], lastValue: values[0] };
  }

  const slope = computeLinearSlope(values);
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const baseline = Math.abs(firstValue) > 0 ? firstValue : 1;
  const changePercent = parseFloat(((lastValue - firstValue) / Math.abs(baseline) * 100).toFixed(2));
  const direction = classifyTrend(slope, firstValue);
  const isSignificant = Math.abs(changePercent) >= 5;
  const confidence = Math.min(0.99, 0.5 + values.length * 0.04);

  return { direction, slope: parseFloat(slope.toFixed(6)), changePercent, isSignificant, confidence, firstValue, lastValue };
}

export function computePrevalence(count: number, cohortSize: number): number {
  if (cohortSize === 0) return 0;
  return parseFloat((count / cohortSize * 100).toFixed(2));
}

export function computeIncidenceRate(newCases: number, populationAtRisk: number, periodDays: number): number {
  if (populationAtRisk === 0 || periodDays === 0) return 0;
  return parseFloat((newCases / populationAtRisk * 1000 / (periodDays / 365)).toFixed(4));
}

export function detectSignificantTrends(
  metricHistory: Array<{ key: string; values: number[] }>,
  minChangePercent = 5,
): Array<{ key: string; trend: TrendResult }> {
  return metricHistory
    .map(({ key, values }) => ({ key, trend: analyzeTrend(values) }))
    .filter(({ trend }) => trend.isSignificant && Math.abs(trend.changePercent) >= minChangePercent);
}

export function computeMovingAverage(values: number[], windowSize: number): number[] {
  if (values.length === 0 || windowSize <= 0) return [];
  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    return parseFloat((window.reduce((s, v) => s + v, 0) / window.length).toFixed(4));
  });
}
