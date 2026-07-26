export interface PatientDemographics {
  age: number;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  weight?: number;
  height?: number;
  bmi?: number;
}

export interface GeneticProfile {
  variants: Array<{ gene: string; haplotype: string; phenotype?: string }>;
  acmgClasses?: string[];
  pgxSummary?: Record<string, string>;
}

export interface MedicationEntry {
  name: string;
  dose?: string;
  startDate?: Date;
  isCurrent: boolean;
}

export interface BiomarkerSnapshot {
  marker: string;
  value: number;
  unit: string;
  measuredAt?: Date;
  referenceRange?: { low: number; high: number };
}

export class DecisionContext {
  readonly id: string;
  readonly patientId: string;
  readonly demographics: PatientDemographics;
  readonly conditions: string[];
  readonly biomarkers: BiomarkerSnapshot[];
  readonly medications: MedicationEntry[];
  readonly allergies: string[];
  readonly geneticProfile?: GeneticProfile;
  readonly timelineId?: string;
  readonly digitalTwinId?: string;
  readonly createdAt: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    demographics: PatientDemographics;
    conditions?: string[];
    biomarkers?: BiomarkerSnapshot[];
    medications?: MedicationEntry[];
    allergies?: string[];
    geneticProfile?: GeneticProfile;
    timelineId?: string;
    digitalTwinId?: string;
  }) {
    this.id = params.id ?? `ctx-${params.patientId}-${Date.now()}`;
    this.patientId = params.patientId;
    this.demographics = params.demographics;
    this.conditions = params.conditions ?? [];
    this.biomarkers = params.biomarkers ?? [];
    this.medications = params.medications ?? [];
    this.allergies = params.allergies ?? [];
    this.geneticProfile = params.geneticProfile;
    this.timelineId = params.timelineId;
    this.digitalTwinId = params.digitalTwinId;
    this.createdAt = new Date();
  }

  getBiomarker(marker: string): BiomarkerSnapshot | undefined {
    return this.biomarkers.find((b) => b.marker.toLowerCase() === marker.toLowerCase());
  }

  getBiomarkerValue(marker: string): number | undefined {
    return this.getBiomarker(marker)?.value;
  }

  hasCondition(condition: string): boolean {
    return this.conditions.some((c) => c.toLowerCase().includes(condition.toLowerCase()));
  }

  hasAllergy(allergen: string): boolean {
    return this.allergies.some((a) => a.toLowerCase().includes(allergen.toLowerCase()));
  }

  getCurrentMedications(): MedicationEntry[] {
    return this.medications.filter((m) => m.isCurrent);
  }

  hasMedication(name: string): boolean {
    return this.getCurrentMedications().some((m) =>
      m.name.toLowerCase().includes(name.toLowerCase()),
    );
  }
}
