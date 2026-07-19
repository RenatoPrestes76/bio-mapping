import type { OmicsType } from '../entities/omics-profile.entity.js';

export type NormalizationMethod =
  | 'Z_SCORE'
  | 'LOG2'
  | 'MIN_MAX'
  | 'CLR'
  | 'QUANTILE'
  | 'NONE'
  | 'AUTO';

export interface NormalizedDataset {
  id: string;
  datasetId: string;
  profileId: string;
  omicsType: string;
  method: NormalizationMethod;
  normalizedValues: Record<string, number>;
  originalStats: {
    mean: number;
    std: number;
    min: number;
    max: number;
    count: number;
  };
  normalizedAt: Date;
}

export const RECOMMENDED_METHOD: Record<OmicsType, NormalizationMethod> = {
  GENOMICS: 'MIN_MAX',
  TRANSCRIPTOMICS: 'LOG2',
  PROTEOMICS: 'Z_SCORE',
  METABOLOMICS: 'LOG2',
  MICROBIOME: 'CLR',
  EPIGENOMICS: 'MIN_MAX',
  LIPIDOMICS: 'LOG2',
  GLYCOMICS: 'CLR',
};

export function computeStats(values: number[]): {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
} {
  const count = values.length;
  if (count === 0) return { mean: 0, std: 0, min: 0, max: 0, count: 0 };

  let sum = 0;
  let minVal = values[0];
  let maxVal = values[0];
  for (const v of values) {
    sum += v;
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }
  const mean = sum / count;

  let variance = 0;
  for (const v of values) {
    variance += (v - mean) ** 2;
  }
  variance /= count;

  return {
    mean: Math.round(mean * 1e6) / 1e6,
    std: Math.round(Math.sqrt(variance) * 1e6) / 1e6,
    min: minVal,
    max: maxVal,
    count,
  };
}

export function zScoreNormalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const { mean, std } = computeStats(values);
  if (std === 0) return values.map(() => 0);
  return values.map((v) => Math.round(((v - mean) / std) * 1e6) / 1e6);
}

export function log2Transform(values: number[]): number[] {
  return values.map((v) => Math.round(Math.log2(Math.max(0, v) + 1) * 1e6) / 1e6);
}

export function minMaxScale(values: number[]): number[] {
  if (values.length === 0) return [];
  const { min, max } = computeStats(values);
  const range = max - min;
  if (range === 0) return values.map(() => 0);
  return values.map((v) => Math.round(((v - min) / range) * 1e6) / 1e6);
}

export function clrTransform(values: number[]): number[] {
  if (values.length === 0) return [];
  const nonZero = values.map((v) => Math.max(v, 1e-10));
  const sumLog = nonZero.reduce((acc, v) => acc + Math.log(v), 0);
  const logGeoMean = sumLog / nonZero.length;
  return nonZero.map((v) => Math.round((Math.log(v) - logGeoMean) * 1e6) / 1e6);
}

export function quantileNormalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const n = indexed.length;
  const result = new Array<number>(n);
  indexed.forEach((item, rank) => {
    result[item.i] = Math.round(((rank + 1) / n) * 1e6) / 1e6;
  });
  return result;
}

export function applyMethod(values: number[], method: NormalizationMethod): number[] {
  switch (method) {
    case 'Z_SCORE':
      return zScoreNormalize(values);
    case 'LOG2':
      return log2Transform(values);
    case 'MIN_MAX':
      return minMaxScale(values);
    case 'CLR':
      return clrTransform(values);
    case 'QUANTILE':
      return quantileNormalize(values);
    case 'NONE':
      return [...values];
    default:
      return zScoreNormalize(values);
  }
}
