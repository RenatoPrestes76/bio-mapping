export class BioScoreResponseDto {
  id: string;
  patientId: string;
  calculatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  healthScore: number;
  recoveryScore: number;
  cardioScore: number;
  bodyScore: number;
  sleepScore: number;
  activityScore: number;
  consistencyScore: number;
  metadata?: unknown;
}

export function toBioScoreResponse(record: any): BioScoreResponseDto {
  return {
    id: record.id,
    patientId: record.patientId,
    calculatedAt: record.calculatedAt,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    healthScore: record.healthScore,
    recoveryScore: record.recoveryScore,
    cardioScore: record.cardioScore,
    bodyScore: record.bodyScore,
    sleepScore: record.sleepScore,
    activityScore: record.activityScore,
    consistencyScore: record.consistencyScore,
    metadata: record.metadata ?? undefined,
  };
}

export class SleepMetricsResponseDto {
  id: string;
  patientId: string;
  date: Date;
  bedtime?: Date;
  wakeTime?: Date;
  totalMinutes?: number;
  deepMinutes?: number;
  remMinutes?: number;
  lightMinutes?: number;
  awakeMinutes?: number;
  efficiency?: number;
  sleepDebtMin?: number;
  classification?: string;
  source: string;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toSleepMetricsResponse(record: any): SleepMetricsResponseDto {
  return { ...record };
}

export class SportMetricsResponseDto {
  id: string;
  patientId: string;
  recordedAt: Date;
  sport: string;
  avgPaceSecPerKm?: number;
  maxPaceSecPerKm?: number;
  vo2maxEstimated?: number;
  weeklyDistanceM?: number;
  weeklyLoadPoints?: number;
  estimatedFtpWatts?: number;
  avgCadenceRpm?: number;
  avgSpeedKph?: number;
  avgPacePer100mSec?: number;
  swolf?: number;
  weeklyVolumeSets?: number;
  weeklyTonnageKg?: number;
  loadProgressionPct?: number;
  sessionCount?: number;
  activeDays?: number;
  createdAt: Date;
}

export function toSportMetricsResponse(record: any): SportMetricsResponseDto {
  return { ...record };
}

export class RecoveryResponseDto {
  id: string;
  patientId: string;
  recordedAt: Date;
  recoveryScore: number;
  sleepScore?: number;
  hrvScore?: number;
  hrScore?: number;
  trainingLoadScore?: number;
  acuteLoad?: number;
  chronicLoad?: number;
  trainingStressBalance?: number;
  recommendation?: string;
  createdAt: Date;
}

export function toRecoveryResponse(record: any): RecoveryResponseDto {
  return { ...record };
}
