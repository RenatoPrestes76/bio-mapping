import { ClinicalKnowledge, DecisionPriority, DecisionType, EvidenceLevel } from '@bio/database';
import { ClinicalRule, PatientTriggerData, RuleEvaluationResult } from '../interfaces/clinical-rule.interface.js';

const CLINICAL_CODE = 'E78';

export class DyslipidemiaRule implements ClinicalRule {
  readonly ruleId = 'DYSLIPIDEMIA_SIGNIFICANT';
  readonly decisionType = DecisionType.ALERT;
  readonly priority = DecisionPriority.HIGH;

  supports(data: PatientTriggerData): boolean {
    return data.ldl !== undefined || data.triglycerides !== undefined;
  }

  async evaluate(data: PatientTriggerData, knowledge: ClinicalKnowledge[]): Promise<RuleEvaluationResult | null> {
    const ldl = data.ldl;
    const tg = data.triglycerides;

    const ldlTriggered = ldl !== undefined && ldl >= 190;
    const tgTriggered = tg !== undefined && tg >= 500;

    if (!ldlTriggered && !tgTriggered) return null;

    const kb = knowledge.find((k) => k.clinicalCode === CLINICAL_CODE);

    const details = [
      ldlTriggered ? `LDL ${ldl} mg/dL` : null,
      tgTriggered ? `Triglicerídeos ${tg} mg/dL` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const isSevereTg = tg !== undefined && tg >= 500;

    return {
      triggered: true,
      title: 'Dislipidemia Importante',
      description: `Perfil lipídico fora dos limites de segurança: ${details}.`,
      recommendation: isSevereTg
        ? 'Triglicerídeos ≥ 500 mg/dL: risco de pancreatite aguda. Iniciar terapia com fibratos imediatamente. Restringir gordura e álcool.'
        : 'Iniciar ou ajustar terapia com estatina de alta potência. Avaliar causas secundárias. Reforçar mudanças alimentares.',
      rationale: 'LDL ≥ 190 mg/dL sugere hipercolesterolemia familiar. Triglicerídeos ≥ 500 mg/dL aumenta risco de pancreatite aguda.',
      evidenceLevel: EvidenceLevel.A,
      knowledgeId: kb?.id,
    };
  }
}
