import { clamp, round1, round2 } from '../utils/math.utils.js';
import type {
  ActivityLevel,
  BmiClassification,
  BodyClassification,
  BodyMetricsInput,
  BodyMetricsResult,
  Gender,
} from '../interfaces/index.js';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return round2(weightKg / (heightM * heightM));
}

export function classifyBmi(bmi: number): BmiClassification {
  if (bmi < 18.5) return 'Abaixo do peso';
  if (bmi < 25) return 'Peso normal';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidade Grau I';
  if (bmi < 40) return 'Obesidade Grau II';
  return 'Obesidade Grau III';
}

export function calculateIdealWeight(heightCm: number, gender: Gender): number {
  const heightInches = heightCm / 2.54;
  const inchesOver5Feet = Math.max(0, heightInches - 60);
  const base = gender === 'MALE' ? 50 : 45.5;
  return round1(base + 2.3 * inchesOver5Feet);
}

// Deurenberg formula — when no circumference measurements available
export function estimateBodyFatPctBmi(
  bmi: number,
  ageYears: number,
  gender: Gender,
): number {
  const sexFactor = gender === 'MALE' ? 1 : 0;
  const bf = 1.2 * bmi + 0.23 * ageYears - 10.8 * sexFactor - 5.4;
  return round1(clamp(bf, 3, 60));
}

// US Navy method — more accurate when circumferences are available
export function estimateBodyFatNavyMale(
  waistCm: number,
  neckCm: number,
  heightCm: number,
): number {
  const bf =
    86.01 * Math.log10(waistCm - neckCm) -
    70.041 * Math.log10(heightCm) +
    36.76;
  return round1(clamp(bf, 3, 60));
}

export function estimateBodyFatNavyFemale(
  waistCm: number,
  hipCm: number,
  neckCm: number,
  heightCm: number,
): number {
  const bf =
    163.205 * Math.log10(waistCm + hipCm - neckCm) -
    97.684 * Math.log10(heightCm) -
    78.387;
  return round1(clamp(bf, 10, 60));
}

export function calculateLeanMass(weightKg: number, bodyFatPct: number): number {
  return round2(weightKg * (1 - bodyFatPct / 100));
}

export function calculateFatMass(weightKg: number, bodyFatPct: number): number {
  return round2(weightKg * (bodyFatPct / 100));
}

export function calculateWaistHeightRatio(waistCm: number, heightCm: number): number {
  return round2(waistCm / heightCm);
}

// Mifflin-St Jeor equation
export function calculateBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: Gender,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(gender === 'MALE' ? base + 5 : base - 161);
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

// Ratio of actual BMI to ideal BMI (22)
export function calculateObesityIndex(bmi: number): number {
  return round1((bmi / 22) * 100);
}

export function classifyBody(
  bmi: number,
  waistHeightRatio?: number,
): BodyClassification {
  if (bmi < 18.5) return 'Abaixo do peso';
  const whr = waistHeightRatio ?? 0;
  if (bmi < 25 && whr >= 0.5) return 'Risco abdominal';
  if (bmi < 25) return 'Saudável';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidade I';
  if (bmi < 40) return 'Obesidade II';
  return 'Obesidade III';
}

// Converts body metrics into a 0-100 score
export function scoreBody(bmi: number, bodyFatPct: number, gender: Gender): number {
  // BMI score: ideal range 18.5-24.9 → 100, decays outside
  let bmiScore: number;
  if (bmi >= 18.5 && bmi < 25) bmiScore = 100;
  else if (bmi < 18.5) bmiScore = Math.max(0, 100 - (18.5 - bmi) * 10);
  else bmiScore = Math.max(0, 100 - (bmi - 24.9) * 7);

  // Body fat score
  const optimalBfMin = gender === 'MALE' ? 10 : 18;
  const optimalBfMax = gender === 'MALE' ? 18 : 26;
  let bfScore: number;
  if (bodyFatPct >= optimalBfMin && bodyFatPct <= optimalBfMax) bfScore = 100;
  else if (bodyFatPct < optimalBfMin) bfScore = Math.max(0, 100 - (optimalBfMin - bodyFatPct) * 5);
  else bfScore = Math.max(0, 100 - (bodyFatPct - optimalBfMax) * 5);

  return Math.round(bmiScore * 0.5 + bfScore * 0.5);
}

export function computeBodyMetrics(input: BodyMetricsInput): BodyMetricsResult {
  const bmi = calculateBmi(input.weightKg, input.heightCm);
  const bmiClassification = classifyBmi(bmi);
  const idealWeightKg = calculateIdealWeight(input.heightCm, input.gender);

  let bodyFatPct: number;
  if (
    input.gender === 'MALE' &&
    input.waistCm != null &&
    input.neckCm != null
  ) {
    bodyFatPct = estimateBodyFatNavyMale(input.waistCm, input.neckCm, input.heightCm);
  } else if (
    input.gender === 'FEMALE' &&
    input.waistCm != null &&
    input.hipCm != null &&
    input.neckCm != null
  ) {
    bodyFatPct = estimateBodyFatNavyFemale(
      input.waistCm,
      input.hipCm,
      input.neckCm,
      input.heightCm,
    );
  } else {
    bodyFatPct = estimateBodyFatPctBmi(bmi, input.ageYears, input.gender);
  }

  const leanMassKg = calculateLeanMass(input.weightKg, bodyFatPct);
  const fatMassKg = calculateFatMass(input.weightKg, bodyFatPct);
  const waistHeightRatio =
    input.waistCm != null
      ? calculateWaistHeightRatio(input.waistCm, input.heightCm)
      : undefined;
  const bmr = calculateBmr(input.weightKg, input.heightCm, input.ageYears, input.gender);
  const tdee = calculateTdee(bmr, input.activityLevel ?? 'SEDENTARY');
  const obesityIndex = calculateObesityIndex(bmi);
  const bodyClassification = classifyBody(bmi, waistHeightRatio);
  const score = scoreBody(bmi, bodyFatPct, input.gender);

  return {
    bmi,
    bmiClassification,
    idealWeightKg,
    bodyFatPct,
    leanMassKg,
    fatMassKg,
    waistHeightRatio,
    bmr,
    tdee,
    obesityIndex,
    bodyClassification,
    score,
  };
}
