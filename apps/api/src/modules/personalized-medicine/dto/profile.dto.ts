import type {
  Demographics,
  Lifestyle,
  NutritionData,
  PhysicalActivityData,
  SleepData,
  StressData,
  BiomarkerEntry,
  PatientPreferences,
} from '../entities/patient-profile.entity.js';

export class CreateProfileDto {
  patientId: string = '';
  demographics: Demographics = { age: 0, sex: 'OTHER' };
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
}

export class UpdateProfileDto {
  demographics?: Partial<Demographics>;
  clinicalHistory?: string[];
  familyHistory?: string[];
  lifestyle?: Partial<Lifestyle>;
  nutrition?: Partial<NutritionData>;
  physicalActivity?: Partial<PhysicalActivityData>;
  sleep?: Partial<SleepData>;
  stress?: Partial<StressData>;
  biomarkers?: BiomarkerEntry[];
  medications?: string[];
  allergies?: string[];
  preferences?: Partial<PatientPreferences>;
}

export class GeneratePlanDto {
  profileId: string = '';
  targetConditions?: string[];
  timeframeWeeks?: number;
}

export class CompareProfilesDto {
  profileId1: string = '';
  profileId2: string = '';
}
