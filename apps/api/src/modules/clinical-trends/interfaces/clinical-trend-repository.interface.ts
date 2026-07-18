import { ClinicalTrend, TrendDirection, TrendStatus, TrendType } from '@bio/database';

export interface CreateTrendData {
  patientId: string;
  tenantId?: string;
  metric: string;
  trendType: TrendType;
  direction: TrendDirection;
  status?: TrendStatus;
  startDate: Date;
  endDate?: Date;
  confidence: number;
  sourceModule: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

export interface TrendFilters {
  metric?: string;
  status?: TrendStatus;
  trendType?: TrendType;
  limit?: number;
  offset?: number;
}

export interface IClinicalTrendRepository {
  create(data: CreateTrendData): Promise<ClinicalTrend>;
  findByPatient(patientId: string, filters?: TrendFilters): Promise<ClinicalTrend[]>;
  findActive(patientId?: string): Promise<ClinicalTrend[]>;
  findByMetric(patientId: string, metric: string): Promise<ClinicalTrend | null>;
  findById(id: string): Promise<ClinicalTrend | null>;
  archive(id: string, updatedBy?: string): Promise<ClinicalTrend>;
  delete(id: string): Promise<void>;
}
