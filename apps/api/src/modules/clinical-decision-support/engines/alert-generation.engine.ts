import { ClinicalAlert } from '../entities/clinical-alert.entity.js';
import type { DecisionContext } from '../entities/decision-context.entity.js';
import { getBiomarkerAlertSeverity } from '../utils/clinical-threshold.utils.js';
import { KNOWN_DRUG_INTERACTIONS } from '../constants/athena.constants.js';

export class AlertGenerationEngine {
  generate(context: DecisionContext): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];

    alerts.push(...this.generateBiomarkerAlerts(context));
    alerts.push(...this.generateDrugInteractionAlerts(context));
    alerts.push(...this.generateDiseaseAlerts(context));

    return alerts;
  }

  private generateBiomarkerAlerts(context: DecisionContext): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];

    for (const bm of context.biomarkers) {
      const severity = getBiomarkerAlertSeverity(bm.marker, bm.value);
      if (!severity) continue;

      const isLow = bm.referenceRange && bm.value < bm.referenceRange.low;
      const direction = isLow ? 'low' : 'high';

      alerts.push(
        new ClinicalAlert({
          patientId: context.patientId,
          alertType: 'CRITICAL_BIOMARKER',
          severity,
          title: `${bm.marker.toUpperCase()} critically ${direction}`,
          message: `${bm.marker} = ${bm.value} ${bm.unit} is ${direction} (${severity} alert)`,
          triggeredBy: 'alert-generation-engine/biomarker',
          recommendation: this.biomarkerRecommendation(bm.marker, severity),
          evidenceLevel: 'A',
        }),
      );
    }

    return alerts;
  }

  private generateDrugInteractionAlerts(context: DecisionContext): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];
    const currentMeds = context.getCurrentMedications().map((m) => m.name.toLowerCase());

    for (const med of currentMeds) {
      const interactionKey = Object.keys(KNOWN_DRUG_INTERACTIONS).find(
        (k) => med.includes(k) || k.includes(med),
      );
      if (!interactionKey) continue;

      const rule = KNOWN_DRUG_INTERACTIONS[interactionKey];
      const conflicts = rule.conflicts.filter((c) => currentMeds.some((m) => m.includes(c)));
      if (conflicts.length === 0) continue;

      alerts.push(
        new ClinicalAlert({
          patientId: context.patientId,
          alertType: 'DRUG_INTERACTION',
          severity: rule.severity === 'SEVERE' ? 'HIGH' : 'MODERATE',
          title: `Drug interaction: ${med} + ${conflicts.join(', ')}`,
          message: `${rule.reason}. Conflicting agents: ${conflicts.join(', ')}.`,
          triggeredBy: 'alert-generation-engine/drug-interaction',
          recommendation: 'Review medication regimen. Consider alternative agents or dose adjustment.',
          evidenceLevel: 'A',
        }),
      );
    }

    return alerts;
  }

  private generateDiseaseAlerts(context: DecisionContext): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];

    const hba1c = context.getBiomarkerValue('hba1c');
    if (context.hasCondition('diabetes') && hba1c !== undefined && hba1c > 9.0) {
      alerts.push(
        new ClinicalAlert({
          patientId: context.patientId,
          alertType: 'DISEASE_DECOMPENSATION',
          severity: hba1c > 12 ? 'CRITICAL' : 'HIGH',
          title: 'Diabetes decompensation',
          message: `HbA1c ${hba1c}% indicates poor glycemic control in a patient with diabetes.`,
          triggeredBy: 'alert-generation-engine/disease',
          recommendation: 'Intensify glycemic management. Consider endocrinology referral.',
          evidenceLevel: 'A',
        }),
      );
    }

    const systolic = context.getBiomarkerValue('bp_systolic');
    if (context.hasCondition('hypertension') && systolic !== undefined && systolic >= 160) {
      alerts.push(
        new ClinicalAlert({
          patientId: context.patientId,
          alertType: 'DISEASE_DECOMPENSATION',
          severity: systolic >= 180 ? 'CRITICAL' : 'HIGH',
          title: 'Hypertension decompensation',
          message: `Systolic BP ${systolic} mmHg. Uncontrolled hypertension.`,
          triggeredBy: 'alert-generation-engine/disease',
          recommendation: 'Urgent blood pressure management. Evaluate for hypertensive urgency/emergency.',
          evidenceLevel: 'A',
        }),
      );
    }

    const egfr = context.getBiomarkerValue('egfr');
    if (egfr !== undefined && egfr < 30) {
      alerts.push(
        new ClinicalAlert({
          patientId: context.patientId,
          alertType: 'RENAL_RISK',
          severity: egfr < 15 ? 'CRITICAL' : 'HIGH',
          title: 'Severe renal impairment',
          message: `eGFR ${egfr} mL/min/1.73m² — Stage ${egfr < 15 ? 'G5' : 'G4'} CKD.`,
          triggeredBy: 'alert-generation-engine/disease',
          recommendation: 'Nephrology referral. Review and adjust renal-dosed medications.',
          evidenceLevel: 'A',
        }),
      );
    }

    return alerts;
  }

  private biomarkerRecommendation(marker: string, severity: string): string {
    const recs: Record<string, string> = {
      hba1c: 'Review diabetes management and medication adherence.',
      glucose: 'Immediate glucose management. Consider IV dextrose if hypoglycemic.',
      ldl: 'Intensify lipid-lowering therapy. Review statin dose.',
      creatinine: 'Nephrology review. Adjust renal-dosed medications.',
      egfr: 'Nephrology referral. Avoid nephrotoxic agents.',
      bp_systolic: 'Blood pressure management. Evaluate for hypertensive crisis.',
      bp_diastolic: 'Urgent antihypertensive therapy review.',
    };
    return recs[marker.toLowerCase()] ?? `Review ${marker} management plan.`;
  }
}
