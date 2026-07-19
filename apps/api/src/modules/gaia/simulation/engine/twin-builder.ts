export interface PatientTwinData {
  patientId: string;
  tenantId?: string;
  age?: number;
  sex?: string;
  occupation?: string;
  bmi?: number;
  weight?: number;
  height?: number;
  smoking: boolean;
  alcohol?: string;
  lifestyle?: string;
  pregnant?: boolean;
  menopausal?: boolean;
  familyHistory: string[];
  conditions: string[];
  medications: string[];
  baseRiskScore?: number;
  currentRiskLevel?: string;
  longitudinalMetrics?: Array<{ metricName: string; value: number; recordedAt: Date }>;
}

export interface DigitalTwinModel {
  patientId: string;
  tenantId?: string;
  twinVersion: string;
  demographics: Record<string, unknown>;
  clinicalHistory: Record<string, unknown>;
  biomarkers: Record<string, unknown>;
  riskFactors: string[];
  lifestyle: Record<string, unknown>;
  longitudinalData: Record<string, unknown>;
  activeRecommendations: string[];
  dataCompleteness: number;
  missingFields: string[];
  builtAt: Date;
}

const CRITICAL_FIELDS = ['age', 'bmi', 'lifestyle', 'sex', 'alcohol', 'smoking_status', 'family_history', 'conditions'] as const;

export function buildDigitalTwin(data: PatientTwinData): DigitalTwinModel {
  const demographics: Record<string, unknown> = {};
  const clinicalHistory: Record<string, unknown> = {};
  const lifestyle: Record<string, unknown> = {};

  if (data.age !== undefined) demographics.age = data.age;
  if (data.sex) demographics.sex = data.sex;
  if (data.occupation) demographics.occupation = data.occupation;

  if (data.weight !== undefined) clinicalHistory.weight = data.weight;
  if (data.height !== undefined) clinicalHistory.height = data.height;
  if (data.bmi !== undefined) clinicalHistory.bmi = data.bmi;
  if (data.pregnant !== undefined) clinicalHistory.pregnant = data.pregnant;
  if (data.menopausal !== undefined) clinicalHistory.menopausal = data.menopausal;
  clinicalHistory.conditions = data.conditions;
  clinicalHistory.medications = data.medications;
  clinicalHistory.baseRiskScore = data.baseRiskScore ?? 0.3;
  if (data.currentRiskLevel) clinicalHistory.currentRiskLevel = data.currentRiskLevel;

  lifestyle.smoking = data.smoking;
  if (data.alcohol) lifestyle.alcohol = data.alcohol;
  if (data.lifestyle) lifestyle.activityLevel = data.lifestyle;

  const missingFields: string[] = [];
  if (data.age === undefined) missingFields.push('age');
  if (!data.sex) missingFields.push('sex');
  const hasBmi = data.bmi !== undefined || (data.weight !== undefined && data.height !== undefined);
  if (!hasBmi) missingFields.push('bmi');
  if (!data.lifestyle) missingFields.push('lifestyle');
  if (!data.alcohol) missingFields.push('alcohol');
  if (data.familyHistory.length === 0) missingFields.push('family_history');

  const dataCompleteness = Math.max(0, Math.min(1, (CRITICAL_FIELDS.length - missingFields.length) / CRITICAL_FIELDS.length));

  return {
    patientId: data.patientId,
    tenantId: data.tenantId,
    twinVersion: '1.0',
    demographics,
    clinicalHistory,
    biomarkers: {},
    riskFactors: data.familyHistory,
    lifestyle,
    longitudinalData: { metrics: data.longitudinalMetrics ?? [] },
    activeRecommendations: [],
    dataCompleteness,
    missingFields,
    builtAt: new Date(),
  };
}

export function extractBaselineRiskScore(twin: DigitalTwinModel): number {
  const baseRiskScore = (twin.clinicalHistory as Record<string, unknown>).baseRiskScore;
  return typeof baseRiskScore === 'number' ? Math.max(0, Math.min(1, baseRiskScore)) : 0.3;
}

export function mergeTwinUpdate(existing: DigitalTwinModel, update: Partial<PatientTwinData>): PatientTwinData {
  const demo = existing.demographics as Record<string, unknown>;
  const clinical = existing.clinicalHistory as Record<string, unknown>;
  const life = existing.lifestyle as Record<string, unknown>;

  return {
    patientId: existing.patientId,
    tenantId: existing.tenantId,
    age: update.age ?? (demo.age as number | undefined),
    sex: update.sex ?? (demo.sex as string | undefined),
    occupation: update.occupation ?? (demo.occupation as string | undefined),
    bmi: update.bmi ?? (clinical.bmi as number | undefined),
    weight: update.weight ?? (clinical.weight as number | undefined),
    height: update.height ?? (clinical.height as number | undefined),
    smoking: update.smoking ?? (life.smoking as boolean) ?? false,
    alcohol: update.alcohol ?? (life.alcohol as string | undefined),
    lifestyle: update.lifestyle ?? (life.activityLevel as string | undefined),
    pregnant: update.pregnant ?? (clinical.pregnant as boolean | undefined),
    menopausal: update.menopausal ?? (clinical.menopausal as boolean | undefined),
    familyHistory: update.familyHistory ?? existing.riskFactors,
    conditions: update.conditions ?? (clinical.conditions as string[]) ?? [],
    medications: update.medications ?? (clinical.medications as string[]) ?? [],
    baseRiskScore: update.baseRiskScore ?? (clinical.baseRiskScore as number | undefined),
    currentRiskLevel: update.currentRiskLevel ?? (clinical.currentRiskLevel as string | undefined),
  };
}
