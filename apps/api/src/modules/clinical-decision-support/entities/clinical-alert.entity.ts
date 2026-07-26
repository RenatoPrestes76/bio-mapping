export type AlertType =
  | 'CRITICAL_BIOMARKER'
  | 'DRUG_INTERACTION'
  | 'CONTRAINDICATION'
  | 'DISEASE_DECOMPENSATION'
  | 'GENOMIC_RISK'
  | 'RENAL_RISK'
  | 'CARDIOVASCULAR_RISK'
  | 'METABOLIC_RISK'
  | 'ADHERENCE_RISK'
  | 'MONITORING_OVERDUE';

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'INFORMATIONAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';

export class ClinicalAlert {
  readonly id: string;
  readonly patientId: string;
  readonly alertType: AlertType;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly title: string;
  readonly message: string;
  readonly triggeredBy: string;
  readonly recommendation?: string;
  readonly evidenceLevel?: 'A' | 'B' | 'C' | 'D';
  readonly actionRequired: boolean;
  readonly linkedDecisionId?: string;
  readonly generatedAt: Date;
  readonly expiresAt?: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    alertType: AlertType;
    severity: AlertSeverity;
    status?: AlertStatus;
    title: string;
    message: string;
    triggeredBy: string;
    recommendation?: string;
    evidenceLevel?: 'A' | 'B' | 'C' | 'D';
    actionRequired?: boolean;
    linkedDecisionId?: string;
    expiresAt?: Date;
  }) {
    this.id = params.id ?? `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.patientId = params.patientId;
    this.alertType = params.alertType;
    this.severity = params.severity;
    this.status = params.status ?? 'ACTIVE';
    this.title = params.title;
    this.message = params.message;
    this.triggeredBy = params.triggeredBy;
    this.recommendation = params.recommendation;
    this.evidenceLevel = params.evidenceLevel;
    this.actionRequired = params.actionRequired ?? (params.severity === 'CRITICAL' || params.severity === 'HIGH');
    this.linkedDecisionId = params.linkedDecisionId;
    this.generatedAt = new Date();
    this.expiresAt = params.expiresAt;
  }

  isCritical(): boolean {
    return this.severity === 'CRITICAL';
  }

  isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return this.expiresAt < new Date();
  }

  requiresImmediateAction(): boolean {
    return this.isActive() && this.actionRequired && !this.isExpired();
  }

  toSummary(): { id: string; type: AlertType; severity: AlertSeverity; title: string; actionRequired: boolean } {
    return {
      id: this.id,
      type: this.alertType,
      severity: this.severity,
      title: this.title,
      actionRequired: this.actionRequired,
    };
  }
}
