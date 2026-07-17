import { ClinicalRecordType } from '@bio/database';

export interface CanonicalObservation {
  code?: string;
  codeSystem?: string;
  displayName?: string;
  value?: string;
  numericValue?: number;
  unit?: string;
  referenceRange?: string;
  interpretation?: string;
  effectiveDate?: Date;
}

export interface CanonicalClinicalRecord {
  recordType: ClinicalRecordType;
  code?: string;
  codeSystem?: string;
  displayName?: string;
  effectiveDate?: Date;
  sourceId?: string;
  status?: string;
  observations?: CanonicalObservation[];
  payload: Record<string, unknown>;
}

export interface CanonicalMedication {
  name: string;
  code?: string;
  codeSystem?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: Date;
  endDate?: Date;
  prescribedBy?: string;
  sourceId?: string;
  notes?: string;
}

export interface CanonicalAllergy {
  allergen: string;
  code?: string;
  codeSystem?: string;
  reaction?: string;
  severity?: string;
  onsetDate?: Date;
  sourceId?: string;
}

export interface CanonicalProcedure {
  name: string;
  code?: string;
  codeSystem?: string;
  performedDate?: Date;
  performedBy?: string;
  location?: string;
  outcome?: string;
  sourceId?: string;
}

export interface InteropImportPayload {
  records: CanonicalClinicalRecord[];
  medications: CanonicalMedication[];
  allergies: CanonicalAllergy[];
  procedures: CanonicalProcedure[];
}

export interface AdapterContext {
  patientId: string;
  organizationId?: string;
  sourceSystem?: string;
}
