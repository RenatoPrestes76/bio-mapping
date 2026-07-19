export type ScenarioType =
  | 'WEIGHT_LOSS'
  | 'WEIGHT_GAIN'
  | 'EXERCISE_INCREASE'
  | 'ALCOHOL_REDUCTION'
  | 'SMOKING_CESSATION'
  | 'SLEEP_IMPROVEMENT'
  | 'DIETARY_CHANGE'
  | 'TREATMENT_ADHERENCE'
  | 'RISK_FACTOR_REMOVAL'
  | 'CUSTOM';

export type TimeHorizon = 'DAYS_30' | 'DAYS_90' | 'DAYS_180' | 'YEAR_1' | 'YEAR_2' | 'YEAR_5';
export type SimulationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type RiskTrend = 'REDUCTION' | 'STABLE' | 'INCREASE';

export interface ScenarioTemplate {
  scenarioType: ScenarioType;
  name: string;
  description: string;
  defaultParameters: Record<string, unknown>;
}

export interface TopFactor {
  factor: string;
  contribution: number;
  description: string;
}

export interface SimulationRun {
  id: string;
  patientId: string;
  tenantId?: string;
  twinId: string;
  createdBy: string;
  scenarioType: ScenarioType;
  scenarioLabel: string;
  timeHorizon: TimeHorizon;
  status: SimulationStatus;
  modelVersion: string;
  createdAt: string;
}

export interface SimulationResult {
  id: string;
  runId: string;
  baselineRiskScore: number;
  simulatedRiskScore: number;
  expectedRiskVariation: number;
  confidence: number;
  baselineRiskLevel: string;
  simulatedRiskLevel: string;
  topFactors: TopFactor[];
  createdAt: string;
}

export interface SimulationAssumption {
  id: string;
  runId: string;
  category: string;
  description: string;
}

export interface SimulationHistory {
  id: string;
  patientId: string;
  runId: string;
  userId: string;
  action: string;
  summary: string;
  createdAt: string;
}

export interface SimulationComparisonEntry {
  runId: string;
  scenarioLabel: string;
  timeHorizonLabel: string;
  baselineRiskScore: number;
  simulatedRiskScore: number;
  expectedRiskVariation: number;
  expectedRiskVariationPercent: number;
  confidence: number;
  riskTrend: RiskTrend;
  baselineRiskLevel: string;
  simulatedRiskLevel: string;
}

export interface SimulationComparison {
  entries: SimulationComparisonEntry[];
  bestScenario: string | null;
  worstScenario: string | null;
  averageVariation: number;
  summary: string;
}

export interface RunSimulationPayload {
  patientId: string;
  tenantId?: string;
  scenarioType: ScenarioType;
  parameters?: Record<string, unknown>;
  timeHorizon: TimeHorizon;
}

export interface CompareSimulationsPayload {
  runIds: string[];
}
