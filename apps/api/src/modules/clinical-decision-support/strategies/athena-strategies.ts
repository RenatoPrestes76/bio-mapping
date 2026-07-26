import type { ClinicalRecommendationItem } from '../entities/clinical-decision.entity.js';
import type { DecisionContext } from '../entities/decision-context.entity.js';

export interface ClinicalDecisionStrategy {
  readonly type: string;
  readonly priority: number;
  evaluate(context: DecisionContext): ClinicalRecommendationItem[];
}

function makeRec(
  id: string,
  category: ClinicalRecommendationItem['category'],
  action: string,
  rationale: string,
  urgency: ClinicalRecommendationItem['urgency'],
  confidence: number,
  source: string,
  evidenceLevel: 'A' | 'B' | 'C' | 'D' = 'B',
): ClinicalRecommendationItem {
  return { id, category, action, rationale, urgency, confidenceContribution: confidence, sourceModule: source, evidenceLevel };
}

export class PreventiveStrategy implements ClinicalDecisionStrategy {
  readonly type = 'PREVENTIVE';
  readonly priority = 4;

  evaluate(context: DecisionContext): ClinicalRecommendationItem[] {
    const recs: ClinicalRecommendationItem[] = [];
    const age = context.demographics.age;

    if (age >= 50 && !context.conditions.some((c) => c.toLowerCase().includes('colorectal'))) {
      recs.push(makeRec(
        `prev-colon-${Date.now()}`, 'MONITORING',
        'Colorectal cancer screening (colonoscopy)',
        'Age-appropriate preventive screening per ACS guidelines (age ≥50)',
        'ROUTINE', 80, 'PreventiveStrategy', 'A',
      ));
    }

    if (age >= 40) {
      recs.push(makeRec(
        `prev-bp-${Date.now()}`, 'MONITORING',
        'Annual blood pressure screening',
        'Hypertension prevention and early detection',
        'ROUTINE', 90, 'PreventiveStrategy', 'A',
      ));
    }

    if (context.demographics.bmi && context.demographics.bmi >= 25) {
      recs.push(makeRec(
        `prev-weight-${Date.now()}`, 'LIFESTYLE',
        'Structured weight management program',
        `BMI ${context.demographics.bmi} — overweight/obesity prevention strategy`,
        'SHORT_TERM', 75, 'PreventiveStrategy', 'A',
      ));
    }

    return recs;
  }
}

export class DiagnosticStrategy implements ClinicalDecisionStrategy {
  readonly type = 'DIAGNOSTIC';
  readonly priority = 2;

  evaluate(context: DecisionContext): ClinicalRecommendationItem[] {
    const recs: ClinicalRecommendationItem[] = [];

    if (context.hasCondition('diabetes') && !context.getBiomarkerValue('hba1c')) {
      recs.push(makeRec(
        `diag-hba1c-${Date.now()}`, 'MONITORING',
        'HbA1c measurement',
        'Glycemic control assessment required for diabetes management',
        'SHORT_TERM', 95, 'DiagnosticStrategy', 'A',
      ));
    }

    if (context.hasCondition('hypertension') && !context.getBiomarkerValue('creatinine')) {
      recs.push(makeRec(
        `diag-renal-${Date.now()}`, 'MONITORING',
        'Renal function panel (creatinine, eGFR, BMP)',
        'Baseline renal assessment mandatory for hypertension management',
        'SHORT_TERM', 90, 'DiagnosticStrategy', 'A',
      ));
    }

    if (context.hasCondition('dyslipidemia') && !context.getBiomarkerValue('ldl')) {
      recs.push(makeRec(
        `diag-lipid-${Date.now()}`, 'MONITORING',
        'Fasting lipid panel',
        'Lipid monitoring required for dyslipidemia management',
        'SHORT_TERM', 90, 'DiagnosticStrategy', 'A',
      ));
    }

    return recs;
  }
}

export class TherapeuticStrategy implements ClinicalDecisionStrategy {
  readonly type = 'THERAPEUTIC';
  readonly priority = 1;

  evaluate(context: DecisionContext): ClinicalRecommendationItem[] {
    const recs: ClinicalRecommendationItem[] = [];

    const hba1c = context.getBiomarkerValue('hba1c');
    if (context.hasCondition('diabetes') && hba1c !== undefined && hba1c > 9.0) {
      recs.push(makeRec(
        `ther-dm-intensify-${Date.now()}`, 'MEDICATION',
        'Intensify glycemic management — review antidiabetic regimen',
        `HbA1c ${hba1c}% is above target. Consider insulin or GLP-1 agonist addition per ADA guidelines.`,
        'SHORT_TERM', 88, 'TherapeuticStrategy', 'A',
      ));
    }

    const systolic = context.getBiomarkerValue('bp_systolic');
    if (context.hasCondition('hypertension') && systolic !== undefined && systolic >= 160) {
      recs.push(makeRec(
        `ther-htn-${Date.now()}`, 'MEDICATION',
        'Adjust antihypertensive therapy — add or intensify treatment',
        `BP ${systolic} mmHg above target. Add second-line antihypertensive per ESC/JNC guidelines.`,
        systolic >= 180 ? 'IMMEDIATE' : 'SHORT_TERM', 90, 'TherapeuticStrategy', 'A',
      ));
    }

    const ldl = context.getBiomarkerValue('ldl');
    if (context.hasCondition('dyslipidemia') && ldl !== undefined && ldl > 160) {
      recs.push(makeRec(
        `ther-lipid-${Date.now()}`, 'MEDICATION',
        'Initiate or intensify statin therapy',
        `LDL-C ${ldl} mg/dL — high-intensity statin indicated per ACC/AHA guidelines.`,
        'SHORT_TERM', 85, 'TherapeuticStrategy', 'A',
      ));
    }

    return recs;
  }
}

export class MonitoringStrategy implements ClinicalDecisionStrategy {
  readonly type = 'MONITORING';
  readonly priority = 3;

  evaluate(context: DecisionContext): ClinicalRecommendationItem[] {
    const recs: ClinicalRecommendationItem[] = [];

    if (context.hasCondition('diabetes')) {
      recs.push(makeRec(
        `mon-dm-${Date.now()}`, 'MONITORING',
        'Quarterly HbA1c monitoring',
        'Standard diabetes monitoring schedule (ADA 2024)',
        'ROUTINE', 90, 'MonitoringStrategy', 'A',
      ));
    }

    if (context.hasCondition('ckd') || context.getBiomarkerValue('egfr') !== undefined) {
      recs.push(makeRec(
        `mon-ckd-${Date.now()}`, 'MONITORING',
        'eGFR and creatinine every 90 days',
        'CKD progression monitoring per KDIGO guidelines',
        'ROUTINE', 88, 'MonitoringStrategy', 'A',
      ));
    }

    if (context.getCurrentMedications().some((m) => m.name.toLowerCase().includes('statin'))) {
      recs.push(makeRec(
        `mon-statin-${Date.now()}`, 'MONITORING',
        'Liver enzyme monitoring (ALT/AST) every 6 months during statin therapy',
        'Hepatotoxicity monitoring per statin prescribing guidelines',
        'ROUTINE', 80, 'MonitoringStrategy', 'B',
      ));
    }

    return recs;
  }
}

export class LifestyleStrategy implements ClinicalDecisionStrategy {
  readonly type = 'LIFESTYLE';
  readonly priority = 5;

  evaluate(context: DecisionContext): ClinicalRecommendationItem[] {
    const recs: ClinicalRecommendationItem[] = [];

    if (context.hasCondition('diabetes') || context.hasCondition('obesity')) {
      recs.push(makeRec(
        `life-diet-${Date.now()}`, 'LIFESTYLE',
        'Structured dietary intervention — low-carbohydrate or Mediterranean diet',
        'Evidence-based dietary therapy for metabolic conditions (ADA/ESC Grade A)',
        'SHORT_TERM', 85, 'LifestyleStrategy', 'A',
      ));
    }

    if (context.hasCondition('hypertension') || context.hasCondition('cardiovascular')) {
      recs.push(makeRec(
        `life-exercise-${Date.now()}`, 'LIFESTYLE',
        'Aerobic exercise program — 150 min/week moderate-intensity',
        'Physical activity reduces cardiovascular and metabolic risk (ESC/AHA Grade A)',
        'SHORT_TERM', 88, 'LifestyleStrategy', 'A',
      ));
    }

    recs.push(makeRec(
      `life-smoking-${Date.now()}`, 'LIFESTYLE',
      'Smoking cessation counseling and pharmacotherapy if applicable',
      'Smoking cessation significantly reduces all-cause mortality and cardiovascular risk',
      'ROUTINE', 95, 'LifestyleStrategy', 'A',
    ));

    return recs;
  }
}

export class EmergencyStrategy implements ClinicalDecisionStrategy {
  readonly type = 'EMERGENCY';
  readonly priority = 0;

  evaluate(context: DecisionContext): ClinicalRecommendationItem[] {
    const recs: ClinicalRecommendationItem[] = [];

    const glucose = context.getBiomarkerValue('glucose');
    if (glucose !== undefined && glucose < 50) {
      recs.push(makeRec(
        `emerg-hypoglycemia-${Date.now()}`, 'MEDICATION',
        'EMERGENCY: Immediate glucose administration (IV dextrose 50% or glucagon)',
        `Severe hypoglycemia (glucose ${glucose} mg/dL). Life-threatening — immediate treatment required.`,
        'IMMEDIATE', 100, 'EmergencyStrategy', 'A',
      ));
    }

    const systolic = context.getBiomarkerValue('bp_systolic');
    if (systolic !== undefined && systolic >= 180) {
      recs.push(makeRec(
        `emerg-htn-crisis-${Date.now()}`, 'MEDICATION',
        'EMERGENCY: Hypertensive crisis management — IV antihypertensives',
        `BP ${systolic} mmHg constitutes hypertensive emergency. Controlled BP reduction required within 1h.`,
        'IMMEDIATE', 100, 'EmergencyStrategy', 'A',
      ));
    }

    return recs;
  }
}
