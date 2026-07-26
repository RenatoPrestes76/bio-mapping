export type ContraindicationType =
  | 'ABSOLUTE'
  | 'RELATIVE'
  | 'GENETIC'
  | 'ALLERGY'
  | 'DISEASE_RELATED'
  | 'DRUG_DRUG_INTERACTION'
  | 'DOSE_RELATED';

export type ContraindicationSeverity = 'CONTRAINDICATED' | 'SEVERE' | 'MODERATE' | 'MILD' | 'CAUTION';

export class Contraindication {
  readonly id: string;
  readonly patientId: string;
  readonly medication: string;
  readonly contraindicationType: ContraindicationType;
  readonly severity: ContraindicationSeverity;
  readonly reason: string;
  readonly evidenceSummary: string;
  readonly evidenceLevel: 'A' | 'B' | 'C' | 'D';
  readonly conflictingAgent?: string;
  readonly conditionName?: string;
  readonly geneVariant?: string;
  readonly alternativeSuggested?: string;
  readonly guideline?: string;
  readonly detectedAt: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    medication: string;
    contraindicationType: ContraindicationType;
    severity: ContraindicationSeverity;
    reason: string;
    evidenceSummary: string;
    evidenceLevel?: 'A' | 'B' | 'C' | 'D';
    conflictingAgent?: string;
    conditionName?: string;
    geneVariant?: string;
    alternativeSuggested?: string;
    guideline?: string;
  }) {
    this.id = params.id ?? `ci-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.patientId = params.patientId;
    this.medication = params.medication;
    this.contraindicationType = params.contraindicationType;
    this.severity = params.severity;
    this.reason = params.reason;
    this.evidenceSummary = params.evidenceSummary;
    this.evidenceLevel = params.evidenceLevel ?? 'B';
    this.conflictingAgent = params.conflictingAgent;
    this.conditionName = params.conditionName;
    this.geneVariant = params.geneVariant;
    this.alternativeSuggested = params.alternativeSuggested;
    this.guideline = params.guideline;
    this.detectedAt = new Date();
  }

  isAbsolute(): boolean {
    return this.severity === 'CONTRAINDICATED';
  }

  requiresAlternative(): boolean {
    return this.severity === 'CONTRAINDICATED' || this.severity === 'SEVERE';
  }

  toSummary(): { medication: string; severity: ContraindicationSeverity; reason: string; hasAlternative: boolean } {
    return {
      medication: this.medication,
      severity: this.severity,
      reason: this.reason,
      hasAlternative: !!this.alternativeSuggested,
    };
  }
}
