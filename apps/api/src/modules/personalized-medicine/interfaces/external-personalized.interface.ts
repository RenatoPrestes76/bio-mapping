export interface IGenomicsVariant {
  gene: string;
  variant: string;
  significance: 'PATHOGENIC' | 'LIKELY_PATHOGENIC' | 'UNCERTAIN' | 'BENIGN';
  associatedConditions: string[];
}

export interface IGenomicsReport {
  patientId: string;
  reportDate: string;
  variants: IGenomicsVariant[];
  polygeneticRiskScores: Record<string, number>;
}

export interface IPharmacogenomicsResult {
  gene: string;
  phenotype: 'POOR_METABOLIZER' | 'INTERMEDIATE' | 'NORMAL' | 'RAPID' | 'ULTRA_RAPID';
  affectedMedications: string[];
  recommendation: string;
}

export interface IWearableDataPoint {
  deviceId: string;
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
}

export interface IWearableSummary {
  patientId: string;
  period: { start: string; end: string };
  steps?: number;
  heartRate?: { avg: number; min: number; max: number };
  sleepHours?: number;
  activeMinutes?: number;
  caloriesBurned?: number;
  hrv?: number;
}

export interface IDigitalTherapeuticSession {
  sessionId: string;
  patientId: string;
  interventionType: string;
  duration: number;
  completionRate: number;
  outcomes: Record<string, number>;
}

export interface IFHIRCarePlan {
  resourceType: 'CarePlan';
  id: string;
  status: 'draft' | 'active' | 'suspended' | 'completed' | 'revoked';
  intent: 'proposal' | 'plan' | 'order';
  subject: { reference: string };
  period?: { start: string; end?: string };
  goal?: { reference: string }[];
  activity?: Array<{
    detail: {
      kind?: string;
      code?: { coding: { system: string; code: string; display: string }[] };
      status: string;
      description?: string;
    };
  }>;
}

export interface IFHIRPatientSummary {
  resourceType: 'Patient';
  id: string;
  name?: { family?: string; given?: string[] }[];
  birthDate: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  condition?: string[];
  observation?: Record<string, number>;
}

export interface IGenomicsAdapter {
  getReport(patientId: string): Promise<IGenomicsReport>;
  integrateVariants(report: IGenomicsReport): Promise<Record<string, number>>;
}

export interface IPharmacogenomicsAdapter {
  getResults(patientId: string): Promise<IPharmacogenomicsResult[]>;
  checkInteractions(medications: string[], results: IPharmacogenomicsResult[]): Promise<string[]>;
}

export interface IWearableAdapter {
  getSummary(patientId: string, days?: number): Promise<IWearableSummary>;
  getDataPoints(patientId: string, metric: string): Promise<IWearableDataPoint[]>;
}

export interface IDigitalTherapeuticsAdapter {
  getSessions(patientId: string): Promise<IDigitalTherapeuticSession[]>;
  prescribeIntervention(patientId: string, interventionType: string): Promise<string>;
}

export interface IFHIRPersonalizedAdapter {
  exportCarePlan(planId: string): Promise<IFHIRCarePlan>;
  importPatient(fhirPatient: IFHIRPatientSummary): Promise<string>;
}

export interface IPersonalizedMedicineExternalRegistry {
  genomics?: IGenomicsAdapter;
  pharmacogenomics?: IPharmacogenomicsAdapter;
  wearable?: IWearableAdapter;
  digitalTherapeutics?: IDigitalTherapeuticsAdapter;
  fhir?: IFHIRPersonalizedAdapter;
}
