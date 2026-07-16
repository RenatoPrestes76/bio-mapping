import { clamp, exponentialMovingAverage, round2 } from '../utils/math.utils.js';
import type {
  RecoveryInput,
  RecoveryRecommendation,
  RecoveryResult,
} from '../interfaces/index.js';

// Exponential weighted moving average with lambda=7 (Acute Training Load, 7-day)
export function calculateAtl(trainingLoads: number[]): number {
  return exponentialMovingAverage(trainingLoads, 7);
}

// Exponential weighted moving average with lambda=28 (Chronic Training Load, 28-day)
export function calculateCtl(trainingLoads: number[]): number {
  return exponentialMovingAverage(trainingLoads, 28);
}

export function getRecoveryRecommendation(score: number): RecoveryRecommendation {
  if (score >= 80) return 'INTENSO';
  if (score >= 60) return 'MODERADO';
  if (score >= 40) return 'LEVE';
  return 'DESCANSO';
}

export function computeRecoveryScore(input: RecoveryInput): RecoveryResult {
  const componentScores: Array<{ score: number; weight: number; label: string }> = [];

  // Sleep score (30%)
  let sleepScore: number | undefined;
  if (input.sleepEfficiency != null || input.sleepHours != null) {
    const effScore = input.sleepEfficiency != null ? input.sleepEfficiency : 75;
    const hrScore =
      input.sleepHours != null
        ? Math.min(100, (input.sleepHours / 8) * 100)
        : 75;
    sleepScore = Math.round(effScore * 0.6 + hrScore * 0.4);
    componentScores.push({ score: sleepScore, weight: 0.3, label: 'sleep' });
  }

  // HRV score (25%) — higher HRV relative to baseline = better recovery
  let hrvScore: number | undefined;
  if (input.hrv != null && input.hrvBaseline != null && input.hrvBaseline > 0) {
    const ratio = input.hrv / input.hrvBaseline;
    hrvScore = Math.round(clamp(ratio * 100, 0, 100));
    componentScores.push({ score: hrvScore, weight: 0.25, label: 'hrv' });
  }

  // Resting HR score (20%) — lower relative to baseline = better recovery
  let hrScore: number | undefined;
  if (input.restingHr != null && input.restingHrBaseline != null && input.restingHrBaseline > 0) {
    const ratio = input.restingHrBaseline / input.restingHr;
    hrScore = Math.round(clamp(ratio * 100, 0, 100));
    componentScores.push({ score: hrScore, weight: 0.2, label: 'hr' });
  }

  // Training load score (25%) — Training Stress Balance
  let trainingLoadScore: number | undefined;
  let tsb: number | undefined;
  if (input.acuteLoad != null && input.chronicLoad != null) {
    tsb = round2(input.chronicLoad - input.acuteLoad);
    // TSB: negative = fatigued, positive = fresh
    // Map: -50 → 0, 0 → 50, +30 → 100
    trainingLoadScore = Math.round(clamp(50 + tsb * (50 / 30), 0, 100));
    componentScores.push({ score: trainingLoadScore, weight: 0.25, label: 'load' });
  }

  let recoveryScore: number;
  if (componentScores.length === 0) {
    recoveryScore = 50;
  } else {
    const totalWeight = componentScores.reduce((s, c) => s + c.weight, 0);
    recoveryScore = Math.round(
      componentScores.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0),
    );
  }

  const recommendation = getRecoveryRecommendation(recoveryScore);

  return {
    recoveryScore,
    sleepScore,
    hrvScore,
    hrScore,
    trainingLoadScore,
    trainingStressBalance: tsb,
    recommendation,
  };
}
