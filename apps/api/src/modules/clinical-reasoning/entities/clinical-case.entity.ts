export enum Sex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export interface BiomarkerValue {
  name: string;
  value: number;
  unit?: string;
  referenceMin?: number;
  referenceMax?: number;
}

export interface LifestyleData {
  smoking?: boolean;
  alcoholUse?: 'NONE' | 'MODERATE' | 'HEAVY';
  physicalActivity?: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'VIGOROUS' | string;
  sleepHours?: number;
  dietType?: string;
}

export interface ClinicalCaseData {
  id?: string;
  patientId?: string;
  age: number;
  sex: Sex;
  conditions?: string[];
  symptoms?: string[];
  biomarkers?: BiomarkerValue[];
  medications?: string[];
  lifestyle?: LifestyleData;
  familyHistory?: string[];
  createdAt?: Date;
}

export class ClinicalCase {
  readonly id: string;
  readonly patientId: string;
  readonly age: number;
  readonly sex: Sex;
  readonly conditions: string[];
  readonly symptoms: string[];
  readonly biomarkers: BiomarkerValue[];
  readonly medications: string[];
  readonly lifestyle: LifestyleData;
  readonly familyHistory: string[];
  readonly createdAt: Date;

  constructor(data: ClinicalCaseData) {
    this.id = data.id ?? `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.patientId = data.patientId ?? this.id;
    this.age = data.age;
    this.sex = data.sex;
    this.conditions = data.conditions ?? [];
    this.symptoms = data.symptoms ?? [];
    this.biomarkers = data.biomarkers ?? [];
    this.medications = data.medications ?? [];
    this.lifestyle = data.lifestyle ?? {};
    this.familyHistory = data.familyHistory ?? [];
    this.createdAt = data.createdAt ?? new Date();
  }

  hasCondition(condition: string): boolean {
    const q = condition.toLowerCase();
    return this.conditions.some((c) => c.toLowerCase().includes(q));
  }

  hasSymptom(symptom: string): boolean {
    const q = symptom.toLowerCase();
    return this.symptoms.some((s) => s.toLowerCase().includes(q));
  }

  getBiomarker(name: string): BiomarkerValue | undefined {
    const q = name.toLowerCase();
    return this.biomarkers.find((b) => b.name.toLowerCase() === q);
  }

  isElderly(): boolean {
    return this.age >= 65;
  }

  isSedentary(): boolean {
    return (
      this.lifestyle.physicalActivity === 'SEDENTARY' ||
      !this.lifestyle.physicalActivity
    );
  }

  isSmoker(): boolean {
    return this.lifestyle.smoking === true;
  }

  hasFamilyHistory(condition: string): boolean {
    const q = condition.toLowerCase();
    return this.familyHistory.some((h) => h.toLowerCase().includes(q));
  }
}
