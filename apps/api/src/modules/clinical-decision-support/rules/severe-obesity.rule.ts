import { ClinicalKnowledge, DecisionPriority, DecisionType, EvidenceLevel } from '@bio/database';
import { ClinicalRule, PatientTriggerData, RuleEvaluationResult } from '../interfaces/clinical-rule.interface.js';

const CLINICAL_CODE = 'E66';

export class SevereObesityRule implements ClinicalRule {
  readonly ruleId = 'SEVERE_OBESITY';
  readonly decisionType = DecisionType.RECOMMENDATION;
  readonly priority = DecisionPriority.HIGH;

  supports(data: PatientTriggerData): boolean {
    return data.bmi !== undefined;
  }

  async evaluate(data: PatientTriggerData, knowledge: ClinicalKnowledge[]): Promise<RuleEvaluationResult | null> {
    const bmi = data.bmi ?? 0;

    if (bmi < 35) return null;

    const kb = knowledge.find((k) => k.clinicalCode === CLINICAL_CODE);
    const isMorbid = bmi >= 40;

    return {
      triggered: true,
      title: isMorbid ? 'Obesidade Grau III (Mórbida)' : 'Obesidade Grau II com Indicação Cirúrgica Potencial',
      description: `IMC atual: ${bmi.toFixed(1)} kg/m² — ${isMorbid ? 'obesidade grau III' : 'obesidade grau II'}.`,
      recommendation: isMorbid
        ? 'Avaliar indicação de cirurgia bariátrica. Encaminhar para equipe multidisciplinar especializada. Rastrear comorbidades.'
        : 'Avaliar indicação de cirurgia bariátrica se houver comorbidades associadas. Intensificar intervenção em estilo de vida.',
      rationale: 'IMC ≥ 35 kg/m² com comorbidades ou IMC ≥ 40 kg/m² é critério estabelecido para avaliação de cirurgia bariátrica.',
      evidenceLevel: EvidenceLevel.A,
      knowledgeId: kb?.id,
    };
  }
}
