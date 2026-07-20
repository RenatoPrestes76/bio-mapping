import type { DecisionType } from '../entities/clinical-decision.entity.js';

export type Urgency = 'IMMEDIATE' | 'ROUTINE' | 'ELECTIVE';

export interface ClinicalFindingsInput {
  conditions?: string[];
  symptoms?: string[];
  medications?: string[];
  vitals?: Record<string, number>;
  labResults?: Record<string, number>;
  age?: number;
  sex?: 'M' | 'F' | 'OTHER';
}

export class AnalyzeClinicalDecisionDto {
  patientId: string = '';
  decisionType: DecisionType = 'COMPREHENSIVE';
  urgency: Urgency = 'ROUTINE';

  clinicalFindings?: ClinicalFindingsInput;

  // References to existing analyses — orchestrator fetches these by ID/patientId
  genomicPatientId?: string;
  pgxPatientId?: string;
  clinicalReasoningInferenceId?: string;
  personalizedMedicineProfileId?: string;

  // Evidence search topics
  evidenceTopics?: string[];

  requestedBy?: string;
}

export class GetDecisionReportDto {
  includeConflicts?: boolean = true;
  includeEvidence?: boolean = true;
  includeExplanation?: boolean = true;
}
