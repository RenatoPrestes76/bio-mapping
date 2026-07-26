import type { ClinicalDecision } from '../entities/clinical-decision.entity.js';
import type { DecisionContext } from '../entities/decision-context.entity.js';

export interface DecisionProvider {
  evaluate(context: DecisionContext): Promise<ClinicalDecision> | ClinicalDecision;
  getDecisionById(id: string): ClinicalDecision | undefined;
  getDecisionsByPatient(patientId: string): ClinicalDecision[];
}
