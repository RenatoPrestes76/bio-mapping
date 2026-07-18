import { ClinicalKnowledge, DecisionPriority, DecisionType, EvidenceLevel } from '@bio/database';
import { ClinicalRule, PatientTriggerData, RuleEvaluationResult } from '../interfaces/clinical-rule.interface.js';

const CLINICAL_CODE = 'I10';

export class HypertensionUncontrolledRule implements ClinicalRule {
  readonly ruleId = 'HYPERTENSION_UNCONTROLLED';
  readonly decisionType = DecisionType.ALERT;
  readonly priority = DecisionPriority.CRITICAL;

  supports(data: PatientTriggerData): boolean {
    return data.bp_systolic !== undefined || data.bp_diastolic !== undefined;
  }

  async evaluate(data: PatientTriggerData, knowledge: ClinicalKnowledge[]): Promise<RuleEvaluationResult | null> {
    const systolic = data.bp_systolic ?? 0;
    const diastolic = data.bp_diastolic ?? 0;

    if (systolic < 160 && diastolic < 100) return null;

    const kb = knowledge.find((k) => k.clinicalCode === CLINICAL_CODE);

    return {
      triggered: true,
      title: 'Hipertensão Arterial Não Controlada',
      description: `Pressão arterial ${systolic}/${diastolic} mmHg — critério de crise hipertensiva (PA ≥ 160/100 mmHg).`,
      recommendation:
        'Avaliar necessidade de ajuste terapêutico imediato. Considerar encaminhamento para urgência se PA ≥ 180/110 mmHg.',
      rationale: 'PA sistólica ≥ 160 mmHg ou diastólica ≥ 100 mmHg configura hipertensão estágio 2 com risco cardiovascular elevado.',
      evidenceLevel: EvidenceLevel.A,
      knowledgeId: kb?.id,
    };
  }
}
