import { TrendStatus } from '@bio/database';
import { METRICS } from '../constants/metrics.constants.js';
import { DataPoint, IClinicalTrendAnalyzer, TrendAnalysisResult } from '../interfaces/clinical-trend-analyzer.interface.js';
import { CreateTrendData } from '../interfaces/clinical-trend-repository.interface.js';
import { computeTrend } from './base-analyzer.js';

export class BloodPressureAnalyzer implements IClinicalTrendAnalyzer {
  readonly metric = METRICS.BLOOD_PRESSURE;

  supports(metric: string): boolean {
    return metric === METRICS.BLOOD_PRESSURE;
  }

  analyze(input: { patientId: string; dataPoints: DataPoint[] }): TrendAnalysisResult {
    return computeTrend(input.dataPoints, {
      metric: this.metric,
      higherIsBetter: false,
      stableThresholdPerDay: 0.5,
      summaryLabel: 'Pressão arterial sistólica',
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
