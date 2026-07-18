import { TrendStatus } from '@bio/database';
import { METRICS } from '../constants/metrics.constants.js';
import { DataPoint, IClinicalTrendAnalyzer, TrendAnalysisResult } from '../interfaces/clinical-trend-analyzer.interface.js';
import { CreateTrendData } from '../interfaces/clinical-trend-repository.interface.js';
import { computeTrend } from './base-analyzer.js';

export class GlycemicAnalyzer implements IClinicalTrendAnalyzer {
  readonly metric = METRICS.GLYCEMIC;

  supports(metric: string): boolean {
    return metric === METRICS.GLYCEMIC;
  }

  analyze(input: { patientId: string; dataPoints: DataPoint[] }): TrendAnalysisResult {
    return computeTrend(input.dataPoints, {
      metric: this.metric,
      higherIsBetter: false,
      stableThresholdPerDay: 0.02,
      summaryLabel: 'HbA1c',
    });
  }

  buildTrend(patientId: string, result: TrendAnalysisResult, createdBy?: string): CreateTrendData {
    return {
      patientId,
      metric: this.metric,
      trendType: result.trendType,
      direction: result.direction,
      status: TrendStatus.ACTIVE,
      startDate: result.startDate,
      endDate: result.endDate,
      confidence: result.confidence,
      sourceModule: 'clinical-decision-support',
      summary: result.summary,
      metadata: result.metadata,
      createdBy,
    };
  }
}
