import { ClinicalKnowledge, DecisionPriority, DecisionType, EvidenceLevel } from '@bio/database';
import { ClinicalRule, PatientTriggerData, RuleEvaluationResult } from '../interfaces/clinical-rule.interface.js';

const CLINICAL_CODE = 'E11';

export class DiabetesHighRiskRule implements ClinicalRule {
  readonly ruleId = 'DIABETES_HIGH_RISK';
  readonly decisionType = DecisionType.ALERT;
  readonly priority = DecisionPriority.HIGH;

  supports(data: PatientTriggerData): boolean {
    return data.glucose !== undefined || data.hba1c !== undefined;
  }

  async evaluate(data: PatientTriggerData, knowledge: ClinicalKnowledge[]): Promise<RuleEvaluationResult | null> {
    const glucose = data.glucose;
    const hba1c = data.hba1c;

    const glucoseTriggered = glucose !== undefined && glucose >= 180;
    const hba1cTriggered = hba1c !== undefined && hba1c >= 8.0;

    if (!glucoseTriggered && !hba1cTriggered) return null;

    const kb = knowledge.find((k) => k.clinicalCode === CLINICAL_CODE);

    const details = [
      glucoseTriggered ? `glicemia ${glucose} mg/dL` : null,
      hba1cTriggered ? `HbA1c ${hba1c}%` : null,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      triggered: true,
      title: 'Diabetes Mellitus com Controle Glicêmico Inadequado',
      description: `Parâmetros glicêmicos fora da meta: ${details}.`,
      recommendation:
        'Revisar esquema terapêutico. Intensificar monitoramento glicêmico. Avaliar adesão ao tratamento e mudanças de estilo de vida.',
      rationale: 'Glicemia ≥ 180 mg/dL ou HbA1c ≥ 8% indica controle glicêmico inadequado com risco aumentado de complicações microvasculares.',
      evidenceLevel: EvidenceLevel.A,
      knowledgeId: kb?.id,
    };
  }
}
