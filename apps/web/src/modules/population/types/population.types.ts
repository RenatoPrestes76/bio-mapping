export type CohortStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type PopulationSegment = 'HEALTHY' | 'AT_RISK' | 'CHRONIC_DISEASES' | 'CARDIOMETABOLIC' | 'ONCOLOGY' | 'MENTAL_HEALTH' | 'WOMENS_HEALTH' | 'SENIOR';
export type CohortAlertSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type CohortAlertType = 'RISK_INCREASE' | 'DISEASE_GROWTH' | 'ADHERENCE_DROP' | 'BIOMARKER_CHANGE' | 'TREND_SHIFT';
export type TrendDirection = 'INCREASING' | 'DECREASING' | 'STABLE';
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';

export interface CohortFilterDefinition {
  filterKey: string;
  filterOperator: FilterOperator;
  filterValue: string;
}

export interface PopulationCohort {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  segment?: PopulationSegment;
  status: CohortStatus;
  patientCount: number;
  filters: CohortFilterDefinition[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PopulationMetric {
  id: string;
  tenantId?: string;
  cohortId?: string;
  metricType: string;
  metricKey: string;
  value: number;
  unit?: string;
  periodStart: string;
  periodEnd: string;
  computedAt: string;
}

export interface PopulationTrend {
  id: string;
  metricKey: string;
  direction: TrendDirection;
  changePercent: number;
  isSignificant: boolean;
  confidence: number;
  computedAt: string;
}

export interface ComputedTrend {
  key: string;
  trend: {
    direction: TrendDirection;
    slope: number;
    changePercent: number;
    isSignificant: boolean;
    confidence: number;
    firstValue: number;
    lastValue: number;
  };
}

export interface PopulationAlert {
  id: string;
  tenantId?: string;
  cohortId?: string;
  alertType: CohortAlertType;
  severity: CohortAlertSeverity;
  title: string;
  description: string;
  metricKey?: string;
  currentValue?: number;
  previousValue?: number;
  isActive: boolean;
  createdAt: string;
}

export interface RiskDistribution {
  counts: { LOW: number; MODERATE: number; HIGH: number; VERY_HIGH: number; CRITICAL: number };
  percentages: { LOW: number; MODERATE: number; HIGH: number; VERY_HIGH: number; CRITICAL: number };
  total: number;
  meanRisk: number;
}

export interface PopulationDashboard {
  totalPatients: number;
  riskDistribution: RiskDistribution;
  segmentCounts: Record<PopulationSegment, number> | null;
  sexDistribution: { MALE: number; FEMALE: number; OTHER: number } | null;
  meanAge: number | null;
  smokingPrevalence: number | null;
  highRiskPercentage: number | null;
}

export interface BenchmarkEntry {
  key: string;
  label: string;
  valueA: number;
  valueB: number | null;
  unit?: string;
  difference: number | null;
  percentDiff: number | null;
}

export interface CreateCohortPayload {
  tenantId?: string;
  name: string;
  description?: string;
  segment?: PopulationSegment;
  filters: CohortFilterDefinition[];
}

export interface CompareCohortsPayload {
  cohortAId: string;
  cohortBId: string;
}
