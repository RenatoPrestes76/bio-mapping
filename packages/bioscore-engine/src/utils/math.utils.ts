export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

export function linearRegression(values: number[]): LinearRegressionResult {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };

  const xMean = (n - 1) / 2;
  const yMean = mean(values);

  let ssxx = 0;
  let ssxy = 0;
  let ssyy = 0;

  for (let i = 0; i < n; i++) {
    ssxx += (i - xMean) ** 2;
    ssxy += (i - xMean) * (values[i] - yMean);
    ssyy += (values[i] - yMean) ** 2;
  }

  const slope = ssxx !== 0 ? ssxy / ssxx : 0;
  const intercept = yMean - slope * xMean;
  const r2 = ssxx !== 0 && ssyy !== 0 ? (ssxy ** 2) / (ssxx * ssyy) : 0;

  return { slope: round2(slope), intercept: round2(intercept), r2: round2(r2) };
}

export function movingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return round2(mean(slice));
  });
}

export function exponentialMovingAverage(values: number[], lambda: number): number {
  let ema = 0;
  for (const v of values) {
    ema = ema + (v - ema) / lambda;
  }
  return round2(ema);
}

export function changePct(start: number, end: number): number {
  if (start === 0) return 0;
  return round2(((end - start) / Math.abs(start)) * 100);
}
