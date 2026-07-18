import { ClinicalKnowledge, DecisionPriority, DecisionType, EvidenceLevel } from '@bio/database';
import { ClinicalRule, PatientTriggerData, RuleEvaluationResult } from '../interfaces/clinical-rule.interface.js';

const CLINICAL_CODE = 'E88.8';

export class MetabolicSyndromeRule implements ClinicalRule {
  readonly ruleId = 'METABOLIC_SYNDROME';
  readonly decisionType = DecisionType.CARE_GAP;
  readonly priority = DecisionPriority.MEDIUM;

  supports(data: PatientTriggerData): boolean {
    const fields: (keyof PatientTriggerData)[] = ['waist', 'triglycerides', 'hdl', 'bp_systolic', 'bp_diastolic', 'glucose'];
    return fields.some((f) => data[f] !== undefined);
  }

  async evaluate(data: PatientTriggerData, knowledge: ClinicalKnowledge[]): Promise<RuleEvaluationResult | null> {
    const criteria: string[] = [];

    if (data.waist !== undefined && data.waist > 102) criteria.push(`circunferência abdominal ${data.waist} cm`);
    if (data.triglycerides !== undefined && data.triglycerides >= 150) criteria.push(`triglicerídeos ${data.triglycerides} mg/dL`);
    if (data.hdl !== undefined && data.hdl < 40) criteria.push(`HDL ${data.hdl} mg/dL (baixo)`);
    if ((data.bp_systolic !== undefined && data.bp_systolic >= 130) || (data.bp_diastolic !== undefined && data.bp_diastolic >= 85)) {
      criteria.push(`PA ${data.bp_systolic ?? '?'}/${data.bp_diastolic ?? '?'} mmHg`);
    }
    if (data.glucose !== undefined && data.glucose >= 100) criteria.push(`glicemia ${data.glucose} mg/dL`);

    if (criteria.length < 3) return null;

    const kb = knowledge.find((k) => k.clinicalCode === CLINICAL_CODE);

    return {
      triggered: true,
      title: 'Síndrome Metabólica Identificada',
      description: `${criteria.length} de 5 critérios presentes: ${criteria.join('; ')}.`,
      recommendation:
        'Iniciar intervenção multidisciplinar intensiva: redução de peso ≥ 5-10%, exercício físico aeróbico 150 min/semana, dieta de baixo índice glicêmico. Rastrear DM2 e DCV.',
      rationale: `Diagnóstico de síndrome metabólica requer ≥ 3 critérios (IDF/NCEP-ATP III). ${criteria.length} critérios identificados aumentam risco cardiovascular e de DM2 em até 5 vezes.`,
      evidenceLevel: EvidenceLevel.A,
      knowledgeId: kb?.id,
    };
  }
}
