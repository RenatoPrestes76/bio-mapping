export interface Demographics {
  age: number;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  height?: number;
  weight?: number;
  bmi?: number;
  ethnicity?: string;
}

export interface Lifestyle {
  smoking?: boolean;
  alcoholUse?: 'NONE' | 'MODERATE' | 'HEAVY';
  physicalActivity?: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'VIGOROUS' | string;
  sleepHours?: number;
  dietType?: string;
  stressLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
}

export interface NutritionData {
  dietType?: string;
  caloricIntake?: number;
  waterIntake?: number;
  mealFrequency?: number;
  dietaryRestrictions?: string[];
}

export interface PhysicalActivityData {
  weeklyMinutes?: number;
  type?: 'AEROBIC' | 'RESISTANCE' | 'MIXED' | 'NONE';
  intensity?: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface SleepData {
  averageHours?: number;
  quality?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  disorders?: string[];
}

export interface StressData {
  level?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  sources?: string[];
}

export interface BiomarkerEntry {
  name: string;
  value: number;
  unit?: string;
  date?: Date;
  referenceMin?: number;
  referenceMax?: number;
}

export interface PatientPreferences {
  language?: string;
  communicationPreference?: 'EMAIL' | 'SMS' | 'APP' | 'PHONE';
  specialistPreferences?: string[];
  dietaryRestrictions?: string[];
  exercisePreferences?: string[];
  treatmentGoals?: string[];
}

export interface PatientProfileData {
  id?: string;
  patientId: string;
  demographics: Demographics;
  clinicalHistory?: string[];
  familyHistory?: string[];
  lifestyle?: Lifestyle;
  nutrition?: NutritionData;
  physicalActivity?: PhysicalActivityData;
  sleep?: SleepData;
  stress?: StressData;
  biomarkers?: BiomarkerEntry[];
  medications?: string[];
  allergies?: string[];
  preferences?: PatientPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PatientProfile {
  readonly id: string;
  readonly patientId: string;
  readonly demographics: Demographics;
  readonly clinicalHistory: string[];
  readonly familyHistory: string[];
  readonly lifestyle: Lifestyle;
  readonly nutrition: NutritionData;
  readonly physicalActivity: PhysicalActivityData;
  readonly sleep: SleepData;
  readonly stress: StressData;
  readonly biomarkers: BiomarkerEntry[];
  readonly medications: string[];
  readonly allergies: string[];
  readonly preferences: PatientPreferences;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: PatientProfileData) {
    this.id = data.id ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = data.patientId;
    this.demographics = data.demographics;
    this.clinicalHistory = data.clinicalHistory ?? [];
    this.familyHistory = data.familyHistory ?? [];
    this.lifestyle = data.lifestyle ?? {};
    this.nutrition = data.nutrition ?? {};
    this.physicalActivity = data.physicalActivity ?? {};
    this.sleep = data.sleep ?? {};
    this.stress = data.stress ?? {};
    this.biomarkers = data.biomarkers ?? [];
    this.medications = data.medications ?? [];
    this.allergies = data.allergies ?? [];
    this.preferences = data.preferences ?? {};
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }

  getBiomarker(name: string): BiomarkerEntry | undefined {
    const q = name.toLowerCase();
    return this.biomarkers.find((b) => b.name.toLowerCase() === q);
  }

  isAbnormal(name: string): boolean {
    const b = this.getBiomarker(name);
    if (!b) return false;
    if (b.referenceMin !== undefined && b.value < b.referenceMin) return true;
    if (b.referenceMax !== undefined && b.value > b.referenceMax) return true;
    return false;
  }

  hasCondition(condition: string): boolean {
    const q = condition.toLowerCase();
    return this.clinicalHistory.some((c) => c.toLowerCase().includes(q));
  }

  hasFamilyHistory(condition: string): boolean {
    const q = condition.toLowerCase();
    return this.familyHistory.some((h) => h.toLowerCase().includes(q));
  }

  isSmoker(): boolean {
    return this.lifestyle.smoking === true;
  }

  isSedentary(): boolean {
    return !this.lifestyle.physicalActivity || this.lifestyle.physicalActivity === 'SEDENTARY';
  }

  isElderly(): boolean {
    return this.demographics.age >= 65;
  }

  computeBMI(): number | undefined {
    if (this.demographics.bmi) return this.demographics.bmi;
    if (this.demographics.weight && this.demographics.height) {
      const h = this.demographics.height / 100;
      return this.demographics.weight / (h * h);
    }
    return undefined;
  }
}
