import { CapabilitySection } from './capability-section.interface';

export interface ClinicalContextMetadata {
  generatedAt: Date;
  window: { from: Date; to: Date };
  sourcesQueried: string[];
}

export interface PatientSummary {
  patientId: string;
  birthDate: Date | null;
  gender: string | null;
  bloodType: string | null;
}

export interface VitalRecordSummary {
  id: string;
  recordedAt: Date;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  heartRate: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
}

export interface BiomarkerSummary {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: string;
  recordedAt: Date;
}

export interface LifestyleRecordSummary {
  id: string;
  type: string;
  value: number | null;
  recordedAt: Date;
}

export interface MedicationSummary {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface ConditionSummary {
  id: string;
  type: string;
  description: string;
  status: string;
  recordedAt: Date | null;
}

export interface AssessmentSummary {
  id: string;
  templateId: string;
  status: string;
  completedAt: Date | null;
}

export interface WearableMetricSummary {
  metricType: string;
  value: number;
  unit: string | null;
  recordedAt: Date;
  source: string;
}

/**
 * Capability-oriented clinical context (Sprint 14.1, Diretriz 3).
 * Several sections have no backing data source yet (nutrition, familyHistory,
 * genomics, imaging, fhirResources) — they stay `{ available: false, items: [] }`
 * on purpose, so adding a real source later never requires reshaping this
 * interface or its consumers.
 */
export interface ClinicalContext {
  patientId: string;
  metadata: ClinicalContextMetadata;
  patient: PatientSummary | null;
  vitals: CapabilitySection<VitalRecordSummary>;
  laboratory: CapabilitySection<BiomarkerSummary>;
  lifestyle: CapabilitySection<LifestyleRecordSummary>;
  nutrition: CapabilitySection<unknown>;
  medication: CapabilitySection<MedicationSummary>;
  conditions: CapabilitySection<ConditionSummary>;
  assessments: CapabilitySection<AssessmentSummary>;
  wearables: CapabilitySection<WearableMetricSummary>;
  familyHistory: CapabilitySection<unknown>;
  genomics: CapabilitySection<unknown>;
  imaging: CapabilitySection<unknown>;
  fhirResources: CapabilitySection<unknown>;
}
