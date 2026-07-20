export type ClinicalEventType =
  | 'CONSULTATION'
  | 'LAB_RESULT'
  | 'DIAGNOSIS'
  | 'MEDICATION'
  | 'PROCEDURE'
  | 'HOSPITALIZATION'
  | 'GENOMIC_EVENT'
  | 'CLINICAL_RECOMMENDATION'
  | 'THERAPEUTIC_CHANGE';

export type EventSeverity = 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'MILD' | 'INFORMATIONAL';
export type EventSource = 'EHR' | 'GAIA' | 'PATIENT_REPORTED' | 'WEARABLE' | 'LAB' | 'GENOMICS' | 'PHARMACY';

export interface BiomarkerValue {
  marker: string;
  value: number;
  unit: string;
  referenceRange?: { low: number; high: number };
}

export interface EventMetadata {
  description?: string;
  provider?: string;
  facility?: string;
  icdCode?: string;
  drugName?: string;
  dosage?: string;
  biomarkers?: BiomarkerValue[];
  conditionName?: string;
  stage?: string;
  responseType?: string;
  [key: string]: unknown;
}

export class ClinicalEvent {
  readonly id: string;
  readonly patientId: string;
  readonly eventType: ClinicalEventType;
  readonly source: EventSource;
  readonly date: Date;
  readonly severity: EventSeverity;
  readonly metadata: EventMetadata;
  readonly createdAt: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    eventType: ClinicalEventType;
    source?: EventSource;
    date: Date | string;
    severity?: EventSeverity;
    metadata?: EventMetadata;
  }) {
    this.id = params.id ?? `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.patientId = params.patientId;
    this.eventType = params.eventType;
    this.source = params.source ?? 'EHR';
    this.date = params.date instanceof Date ? params.date : new Date(params.date);
    this.severity = params.severity ?? 'INFORMATIONAL';
    this.metadata = params.metadata ?? {};
    this.createdAt = new Date();
  }

  isRecent(daysBack = 30): boolean {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    return this.date >= cutoff;
  }

  isClinicallySignificant(): boolean {
    return this.severity === 'CRITICAL' || this.severity === 'SEVERE' || this.severity === 'MODERATE';
  }

  getBiomarkers(): BiomarkerValue[] {
    return this.metadata.biomarkers ?? [];
  }

  getBiomarkerValue(marker: string): number | undefined {
    return this.getBiomarkers().find((b) => b.marker.toLowerCase() === marker.toLowerCase())?.value;
  }

  daysSince(reference: Date): number {
    return Math.floor((reference.getTime() - this.date.getTime()) / 86_400_000);
  }
}
