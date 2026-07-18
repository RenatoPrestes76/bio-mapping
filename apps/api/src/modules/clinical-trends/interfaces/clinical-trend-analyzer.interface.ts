import { TrendDirection, TrendType } from '@bio/database';
import { CreateTrendData } from './clinical-trend-repository.interface.js';

export interface DataPoint {
  value: number;
  secondaryValue?: number;
  timestamp: Date;
}

export interface TrendInput {
  patientId: string;
  dataPoints: DataPoint[];
}

export interface TrendAnalysisResult {
  metric: string;
  trendType: TrendType;
  direction: TrendDirection;
  confidence: number;
  startDate: Date;
  endDate: Date;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface IClinicalTrendAnalyzer {
  readonly metric: string;
  supports(metric: string): boolean;
  analyze(input: TrendInput): TrendAnalysisResult;
  buildTrend(patientId: string, result: TrendAnalysisResult, createdBy?: string): CreateTrendData;
}
