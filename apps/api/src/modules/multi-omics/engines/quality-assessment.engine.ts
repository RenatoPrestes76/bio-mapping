import { OmicsType } from '../entities/omics-profile.entity.js';
import { OmicsDataset } from '../entities/omics-dataset.entity.js';
import {
  QualityReport,
  computeCompleteness,
  computeSNRScore,
  computeCoverageScore,
  computeOverallScore,
  generateQualityIssues,
  QUALITY_THRESHOLDS,
} from '../quality/quality-metrics.js';

export interface QualityTrend {
  profileId: string;
  assessments: Array<{ score: number; assessedAt: Date; method: string }>;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  averageScore: number;
}

export class QualityAssessmentEngine {
  assess(dataset: OmicsDataset, omicsType: OmicsType): QualityReport {
    const completeness = computeCompleteness(dataset.measurements);
    const snrScore = computeSNRScore(dataset.measurements);
    const coverageScore = computeCoverageScore(dataset.getVariableCount(), omicsType);
    const overallScore = computeOverallScore(completeness, snrScore, coverageScore);
    const { issues, recommendations } = generateQualityIssues(completeness, snrScore, coverageScore, omicsType);

    const nonZero = dataset.getNonZeroCount();
    const measurementCount = Object.keys(dataset.measurements).length;

    if (nonZero < measurementCount * 0.3) {
      issues.push('More than 70% of measurements are zero — possible sparse data or processing error');
      recommendations.push('Verify measurement protocol; consider filtering zero-valued entries');
    }

    return {
      profileId: dataset.profileId,
      datasetId: dataset.id,
      omicsType,
      overallScore,
      completeness,
      snrScore,
      coverageScore,
      variableCount: dataset.getVariableCount(),
      measurementCount,
      issues,
      recommendations,
      passesThreshold: overallScore >= QUALITY_THRESHOLDS.usable,
      assessedAt: new Date(),
    };
  }

  computeBatchScore(reports: QualityReport[]): number {
    if (reports.length === 0) return 0;
    return Math.round(
      reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length,
    );
  }

  detectBatchEffect(datasets: OmicsDataset[]): { detected: boolean; explanation: string } {
    if (datasets.length < 2) {
      return { detected: false, explanation: 'Insufficient datasets for batch effect detection' };
    }

    const batchMeans = datasets.map((ds) => {
      const values = Object.values(ds.measurements).filter((v) => !isNaN(v));
      if (values.length === 0) return 0;
      return values.reduce((a, b) => a + b, 0) / values.length;
    });

    const overallMean = batchMeans.reduce((a, b) => a + b, 0) / batchMeans.length;
    const maxDeviation = batchMeans.reduce(
      (max, m) => Math.max(max, Math.abs(m - overallMean)),
      0,
    );
    const cv = overallMean !== 0 ? maxDeviation / Math.abs(overallMean) : 0;

    const detected = cv > 0.5;
    return {
      detected,
      explanation: detected
        ? `Potential batch effect detected (CV = ${(cv * 100).toFixed(1)}%) — consider batch correction`
        : `No significant batch effect detected (CV = ${(cv * 100).toFixed(1)}%)`,
    };
  }

  summarize(reports: QualityReport[]): string {
    if (reports.length === 0) return 'No quality reports available';
    const passing = reports.filter((r) => r.passesThreshold).length;
    const avgScore = Math.round(reports.reduce((s, r) => s + r.overallScore, 0) / reports.length);
    return `${passing}/${reports.length} profiles pass quality threshold (avg score: ${avgScore}/100)`;
  }
}
