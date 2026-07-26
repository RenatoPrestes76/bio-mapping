import type { ClinicalAlert, AlertSeverity } from '../entities/clinical-alert.entity.js';
import type { DecisionContext } from '../entities/decision-context.entity.js';

export interface AlertProvider {
  generate(context: DecisionContext): ClinicalAlert[];
  getByPatient(patientId: string): ClinicalAlert[];
  getBySeverity(patientId: string, severity: AlertSeverity): ClinicalAlert[];
  acknowledge(alertId: string): boolean;
}
