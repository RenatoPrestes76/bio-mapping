export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHT'
  | 'MODERATE'
  | 'ACTIVE'
  | 'VERY_ACTIVE';

export type BmiClassification =
  | 'Abaixo do peso'
  | 'Peso normal'
  | 'Sobrepeso'
  | 'Obesidade Grau I'
  | 'Obesidade Grau II'
  | 'Obesidade Grau III';

export type BodyClassification =
  | 'Abaixo do peso'
  | 'Saudável'
  | 'Risco abdominal'
  | 'Sobrepeso'
  | 'Obesidade I'
  | 'Obesidade II'
  | 'Obesidade III';

export type CardioClassification =
  | 'EXCELENTE'
  | 'MUITO_BOM'
  | 'BOM'
  | 'REGULAR'
  | 'RUIM';

export type SleepClassification = 'EXCELENTE' | 'BOA' | 'REGULAR' | 'RUIM';

export type RecoveryRecommendation =
  | 'DESCANSO'
  | 'LEVE'
  | 'MODERADO'
  | 'INTENSO';

export type TrendDirection = 'IMPROVING' | 'STABLE' | 'DECLINING';

export type AlertType =
  | 'ELEVATED_HEART_RATE'
  | 'PERFORMANCE_DROP'
  | 'INSUFFICIENT_RECOVERY'
  | 'RAPID_WEIGHT_GAIN'
  | 'PROLONGED_SEDENTARISM'
  | 'SLEEP_DEFICIT'
  | 'OVERTRAINING'
  | 'BLOOD_PRESSURE_CONCERN'
  | 'GLUCOSE_CONCERN';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface HrZone {
  min: number;
  max: number;
  name: string;
}

export interface HrZones {
  zone1: HrZone;
  zone2: HrZone;
  zone3: HrZone;
  zone4: HrZone;
  zone5: HrZone;
}

export interface BodyMetricsInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: Gender;
  waistCm?: number;
  hipCm?: number;
  neckCm?: number;
  activityLevel?: ActivityLevel;
}

export interface BodyMetricsResult {
  bmi: number;
  bmiClassification: BmiClassification;
  idealWeightKg: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  waistHeightRatio?: number;
  bmr: number;
  tdee: number;
  obesityIndex: number;
  bodyClassification: BodyClassification;
  score: number;
}

export interface CardioMetricsInput {
  ageYears: number;
  restingHr?: number;
  maxHrMeasured?: number;
  hrvMs?: number;
  cardiacRecoveryBpm?: number;
}

export interface CardioMetricsResult {
  maxHrEstimated: number;
  zones: HrZones;
  classification?: CardioClassification;
  vo2maxEstimated?: number;
  score: number;
}

export interface SleepInput {
  totalMinutes?: number;
  deepMinutes?: number;
  remMinutes?: number;
  awakeMinutes?: number;
  bedtime?: Date;
  wakeTime?: Date;
  recentNightsMinutes?: number[];
}

export interface SleepResult {
  efficiency?: number;
  sleepDebtMin?: number;
  classification?: SleepClassification;
  score: number;
}

export interface RecoveryInput {
  sleepEfficiency?: number;
  sleepHours?: number;
  hrv?: number;
  hrvBaseline?: number;
  restingHr?: number;
  restingHrBaseline?: number;
  acuteLoad?: number;
  chronicLoad?: number;
}

export interface RecoveryResult {
  recoveryScore: number;
  sleepScore?: number;
  hrvScore?: number;
  hrScore?: number;
  trainingLoadScore?: number;
  trainingStressBalance?: number;
  recommendation: RecoveryRecommendation;
}

export interface RunningInput {
  recentRaces?: Array<{ distanceM: number; timeSeconds: number }>;
  weeklyDistanceM?: number;
  weeklySessionCount?: number;
}

export interface CyclingInput {
  power20MinWatts?: number;
  avgCadenceRpm?: number;
  avgSpeedKph?: number;
}

export interface SwimmingInput {
  strokesPerLength?: number;
  secondsPerLength?: number;
  avgPacePer100mSec?: number;
}

export interface StrengthInput {
  sets?: Array<{ reps: number; weightKg: number }>;
  previousTonnageKg?: number;
}

export interface HealthScoreInput {
  cardioScore?: number;
  bodyScore?: number;
  sleepScore?: number;
  activityScore?: number;
  consistencyScore?: number;
}

export interface AlertTrigger {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
}
