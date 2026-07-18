import { ClinicalKnowledge, DecisionPriority, DecisionType, EvidenceLevel } from '@bio/database';

export interface PatientTriggerData {
  bp_systolic?: number;
  bp_diastolic?: number;
  bmi?: number;
  glucose?: number;
  hba1c?: number;
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
  waist?: number;
  [key: string]: unknown;
}

export interface RuleEvaluationResult {
  triggered: boolean;
  title: string;
  description: string;
  recommendation: string;
  rationale: string;
  evidenceLevel: EvidenceLevel;
  knowledgeId?: string;
}

export interface ClinicalRule {
  readonly ruleId: string;
  readonly decisionType: DecisionType;
  readonly priority: DecisionPriority;
  supports(data: PatientTriggerData): boolean;
  evaluate(data: PatientTriggerData, knowledge: ClinicalKnowledge[]): Promise<RuleEvaluationResult | null>;
}
