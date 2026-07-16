import { clamp, round1 } from '../utils/math.utils.js';
import type { SleepClassification, SleepInput, SleepResult } from '../interfaces/index.js';

const TARGET_NIGHTLY_MINUTES = 480; // 8 hours

export function calculateSleepEfficiency(
  totalSleepMin: number,
  timeInBedMin: number,
): number {
  if (timeInBedMin <= 0) return 0;
  return round1(clamp((totalSleepMin / timeInBedMin) * 100, 0, 100));
}

export function calculateSleepDebt(
  sleepHistoryMin: number[],
  targetNightlyMin = TARGET_NIGHTLY_MINUTES,
): number {
  const deficit = sleepHistoryMin.reduce(
    (s, v) => s + Math.max(0, targetNightlyMin - v),
    0,
  );
  return Math.round(deficit);
}

export function classifySleep(
  efficiency: number,
  totalMinutes: number,
): SleepClassification {
  const hours = totalMinutes / 60;
  if (efficiency >= 90 && hours >= 7) return 'EXCELENTE';
  if (efficiency >= 85 && hours >= 6.5) return 'BOA';
  if (efficiency >= 75 && hours >= 6) return 'REGULAR';
  return 'RUIM';
}

function sleepClassificationToScore(classification: SleepClassification): number {
  const map: Record<SleepClassification, number> = {
    EXCELENTE: 100,
    BOA: 75,
    REGULAR: 50,
    RUIM: 25,
  };
  return map[classification];
}

export function computeSleepMetrics(input: SleepInput): SleepResult {
  let efficiency: number | undefined;
  let classification: SleepClassification | undefined;

  if (input.totalMinutes != null) {
    const awake = input.awakeMinutes ?? 0;
    const timeInBed = input.totalMinutes + awake;
    efficiency = calculateSleepEfficiency(input.totalMinutes, timeInBed);
    classification = classifySleep(efficiency, input.totalMinutes);
  } else if (input.bedtime != null && input.wakeTime != null) {
    const timeInBedMin =
      (input.wakeTime.getTime() - input.bedtime.getTime()) / 60000;
    if (timeInBedMin > 0) {
      const awake = input.awakeMinutes ?? 0;
      const totalSleep = timeInBedMin - awake;
      efficiency = calculateSleepEfficiency(totalSleep, timeInBedMin);
      classification = classifySleep(efficiency, totalSleep);
    }
  }

  const sleepDebtMin =
    input.recentNightsMinutes != null
      ? calculateSleepDebt(input.recentNightsMinutes)
      : undefined;

  const score = classification
    ? sleepClassificationToScore(classification)
    : 50;

  return { efficiency, sleepDebtMin, classification, score };
}
