import {
  changePct,
  linearRegression,
  movingAverage,
} from '../utils/math.utils.js';
import type { TrendDirection } from '../interfaces/index.js';

export { movingAverage, linearRegression };

export function getTrend(slope: number, threshold = 0.001): TrendDirection {
  if (slope > threshold) return 'IMPROVING';
  if (slope < -threshold) return 'DECLINING';
  return 'STABLE';
}

// Plateau: relative slope below threshold for the last windowSize points
export function detectPlateau(
  values: number[],
  windowSize = 7,
  relativeThreshold = 0.01,
): boolean {
  if (values.length < windowSize) return false;
  const recent = values.slice(-windowSize);
  const { slope } = linearRegression(recent);
  const m = recent.reduce((s, v) => s + v, 0) / recent.length;
  const relSlope = m !== 0 ? Math.abs(slope / m) : Math.abs(slope);
  return relSlope < relativeThreshold;
}

// For "higher is better" metrics (VO2max, strength distance)
export function isPersonalRecordHigh(current: number, historicalMax: number): boolean {
  return current > historicalMax;
}

// For "lower is better" metrics (pace sec/km, resting HR, body fat)
export function isPersonalRecordLow(current: number, historicalMin: number): boolean {
  return current < historicalMin;
}

export interface TrendReport {
  trend: TrendDirection;
  changePct: number;
  regressionSlope: number;
  movingAvg: number;
  isPlateauDetected: boolean;
}

export function computeTrend(values: number[], higherIsBetter = true): TrendReport {
  const regression = linearRegression(values);
  const slope = higherIsBetter ? regression.slope : -regression.slope;
  const trend = getTrend(slope);
  const plateau = detectPlateau(values);
  const ma = movingAverage(values, Math.min(7, values.length));
  const lastMa = ma[ma.length - 1] ?? 0;
  const pct = changePct(values[0] ?? 0, values[values.length - 1] ?? 0);

  return {
    trend,
    changePct: pct,
    regressionSlope: regression.slope,
    movingAvg: lastMa,
    isPlateauDetected: plateau,
  };
}
