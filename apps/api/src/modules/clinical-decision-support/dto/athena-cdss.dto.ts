import type { PatientDemographics, GeneticProfile, MedicationEntry, BiomarkerSnapshot } from '../entities/decision-context.entity.js';
import type { ClinicalDecision } from '../entities/clinical-decision.entity.js';
import type { ClinicalAlert } from '../entities/clinical-alert.entity.js';
import type { Contraindication } from '../entities/contraindication.entity.js';
import type { DecisionEvidence } from '../entities/decision-evidence.entity.js';
import type { AthenaClinicalExplanation } from '../engines/decision-explanation.engine.js';

export class EvaluatePatientDto {
  patientId: string = '';
  demographics: PatientDemographics = { age: 0, sex: 'OTHER' };
  conditions: string[] = [];
  biomarkers: BiomarkerSnapshot[] = [];
  medications: MedicationEntry[] = [];
  allergies: string[] = [];
  geneticProfile?: GeneticProfile;
  timelineId?: string;
  digitalTwinId?: string;
  strategies?: string[];
}

export class CreateDecisionDto {
  patientId: string = '';
  context: EvaluatePatientDto = new EvaluatePatientDto();
  priority?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'INFORMATIONAL';
  notes?: string;
}

export interface AlertResponseDto {
  patientId: string;
  totalAlerts: number;
  criticalCount: number;
  activeAlerts: ReturnType<ClinicalAlert['toSummary']>[];
}

export interface DecisionResponseDto {
  decisionId: string;
  patientId: string;
  timestamp: Date;
  decision: ClinicalDecision;
  alerts: ClinicalAlert[];
  contraindications: Contraindication[];
  linkedEvidence: DecisionEvidence[];
  explanation: AthenaClinicalExplanation;
  summary: {
    totalRecommendations: number;
    criticalAlerts: number;
    contraindications: number;
    evidencePieces: number;
    confidence: number;
    requiresImmediateAction: boolean;
  };
}
