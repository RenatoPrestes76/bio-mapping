export type CdsPriority = 'LOW' | 'MODERATE' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type CdsAlertType = 'INFORMATIVE' | 'PREVENTIVE' | 'IMPORTANT' | 'URGENT' | 'CRITICAL';
export type EvidenceLevel = 'A' | 'B' | 'C' | 'D' | 'EXPERT_OPINION';

export interface CdsEvaluation {
  id: string;
  patientId: string;
  evaluatedBy?: string;
  priority: CdsPriority;
  confidence: number;
  recommendation: string;
  reasons: string[];
  evidenceLevel: EvidenceLevel;
  requiresMedicalReview: boolean;
  variables?: Record<string, unknown>;
  weights?: Record<string, unknown>;
  rulesTriggered?: Array<{ id: string; name: string; priority: CdsPriority }>;
  modelsUsed?: string[];
  processingTimeMs?: number;
  version?: string;
  createdAt: string;
}

export interface CdsAlert {
  id: string;
  patientId: string;
  evaluationId: string;
  alertType: CdsAlertType;
  priority: CdsPriority;
  reason: string;
  origin: string;
  expiresAt?: string;
  read: boolean;
  createdAt: string;
}

export interface CdsExplanation {
  evaluation: CdsEvaluation;
  reasons: string[];
  variables: Record<string, unknown>;
  weights: Record<string, unknown>;
  rulesTriggered: unknown[];
  modelsUsed: string[];
  confidenceInterpretation: string;
  slaHours: number;
  priorityColor: string;
}

export interface EvaluateCdsInput {
  patientId: string;
  variables: Record<string, number | string | boolean>;
  examCount?: number;
  biomarkerCount?: number;
  hasLongitudinalHistory?: boolean;
  context?: string;
}
