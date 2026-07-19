import type { OmicsType } from '../entities/omics-profile.entity.js';

export interface QualityReport {
  profileId: string;
  datasetId: string;
  omicsType: string;
  overallScore: number;
  completeness: number;
  snrScore: number;
  coverageScore: number;
  variableCount: number;
  measurementCount: number;
  issues: string[];
  recommendations: string[];
  passesThreshold: boolean;
  assessedAt: Date;
}

export const MINIMUM_VARIABLE_COUNTS: Record<OmicsType, number> = {
  GENOMICS: 100,
  TRANSCRIPTOMICS: 500,
  PROTEOMICS: 200,
  METABOLOMICS: 50,
  MICROBIOME: 30,
  EPIGENOMICS: 500,
  LIPIDOMICS: 30,
  GLYCOMICS: 20,
};

export const QUALITY_THRESHOLDS = {
  high: 80,
  usable: 60,
  minimum: 40,
};

export function computeCompleteness(measurements: Record<string, number>): number {
  const values = Object.values(measurements);
  if (values.length === 0) return 0;
  const valid = values.filter((v) => v !== null && v !== undefined && !isNaN(v) && isFinite(v));
  return Math.round((valid.length / values.length) * 100);
}

export function computeSNRScore(measurements: Record<string, number>): number {
  const values = Object.values(measurements).filter((v) => !isNaN(v) && isFinite(v));
  if (values.length === 0) return 0;

  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / values.length;

  let varSum = 0;
  for (const v of values) varSum += (v - mean) ** 2;
  const std = Math.sqrt(varSum / values.length);

  if (std === 0) return 100;
  const rawSNR = Math.abs(mean) / std;
  // Scale: SNR=1 → 50, SNR=3 → 80, SNR≥5 → 100
  return Math.min(100, Math.round(rawSNR * 20));
}

export function computeCoverageScore(variableCount: number, omicsType: OmicsType): number {
  const minimum = MINIMUM_VARIABLE_COUNTS[omicsType] ?? 50;
  return Math.min(100, Math.round((variableCount / minimum) * 100));
}

export function computeOverallScore(
  completeness: number,
  snrScore: number,
  coverageScore: number,
): number {
  return Math.round(completeness * 0.4 + snrScore * 0.3 + coverageScore * 0.3);
}

export function generateQualityIssues(
  completeness: number,
  snrScore: number,
  coverageScore: number,
  omicsType: OmicsType,
): { issues: string[]; recommendations: string[] } {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const minCount = MINIMUM_VARIABLE_COUNTS[omicsType];

  if (completeness < 50) {
    issues.push('High rate of missing measurements detected');
    recommendations.push('Verify data export pipeline; consider re-processing raw files');
  }
  if (completeness < 80) {
    issues.push('Moderate missing data rate');
    recommendations.push('Apply imputation strategy for missing values');
  }
  if (snrScore < 30) {
    issues.push('Low signal-to-noise ratio detected');
    recommendations.push('Consider batch effect correction and data pre-processing');
  }
  if (coverageScore < 50) {
    issues.push(`Insufficient feature coverage — minimum ${minCount} variables recommended for ${omicsType}`);
    recommendations.push('Increase sequencing depth or analytical coverage');
  }

  return { issues, recommendations };
}
