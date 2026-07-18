export type OutcomeCategory = 'IMPROVED' | 'STABLE' | 'WORSENED' | 'HOSPITALIZED' | 'RESOLVED' | 'UNKNOWN';
export type RecommendationAdherence = 'FOLLOWED' | 'PARTIALLY_FOLLOWED' | 'IGNORED';
export type FeedbackClassification = 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT' | 'INCONCLUSIVE';
export type DriftType = 'DATA_DRIFT' | 'CONCEPT_DRIFT' | 'FEATURE_DRIFT' | 'POPULATION_DRIFT';
export type FeedbackRole = 'PHYSICIAN' | 'NUTRITIONIST' | 'HEALTH_PROFESSIONAL' | 'PATIENT';
export type DriftSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface ClinicalOutcome {
  id: string;
  decisionId: string;
  patientId: string;
  followUpDate: string;
  outcome: OutcomeCategory;
  validatedBy: string;
  comments?: string | null;
  modelVersion: string;
  createdAt: string;
}

export interface ModelMetrics {
  id: string;
  modelName: string;
  modelVersion: string;
  accuracy?: number | null;
  precision?: number | null;
  recall?: number | null;
  specificity?: number | null;
  sensitivity?: number | null;
  f1Score?: number | null;
  rocAuc?: number | null;
  calibration?: number | null;
  sampleSize: number;
  computedAt: string;
}

export interface ModelDriftEvent {
  id: string;
  modelName: string;
  driftType: DriftType;
  driftScore: number;
  threshold: number;
  features?: string[] | null;
  severity: DriftSeverity;
  resolved: boolean;
  createdAt: string;
}

export interface LearningFeedback {
  id: string;
  decisionId: string;
  userId: string;
  role: FeedbackRole;
  classification: FeedbackClassification;
  comment?: string | null;
  suggestedAction?: string | null;
  modelVersion: string;
  createdAt: string;
}

export interface ContinuousLearningStatistics {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalDecisions: number;
  totalOutcomes: number;
  overallAccuracy?: number | null;
  driftEventsCount: number;
  feedbackCount: number;
  positiveOutcomeRate?: number | null;
  averageConfidence?: number | null;
  summary?: Record<string, unknown> | null;
  computedAt: string;
}

export interface CreateOutcomePayload {
  decisionId: string;
  patientId: string;
  followUpDate: string;
  outcome: OutcomeCategory;
  validatedBy: string;
  comments?: string;
  predictedValue?: string;
  actualValue?: string;
  recommendation?: string;
  adherence?: RecommendationAdherence;
  tenantId?: string;
}

export interface CreateFeedbackPayload {
  decisionId: string;
  role: FeedbackRole;
  classification: FeedbackClassification;
  comment?: string;
  suggestedAction?: string;
  tenantId?: string;
}
