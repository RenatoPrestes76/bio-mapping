import { mean, stddev } from '../utils/math.utils.js';
import type { AlertTrigger } from '../interfaces/index.js';

export function checkElevatedHr(
  recentHrValues: number[],
  consecutiveDays = 3,
  sdMultiplier = 1,
): AlertTrigger | null {
  if (recentHrValues.length < consecutiveDays + 3) return null;
  const baseline = recentHrValues.slice(0, -consecutiveDays);
  const avg = mean(baseline);
  const sd = stddev(baseline);
  const threshold = avg + sdMultiplier * sd;
  const recent = recentHrValues.slice(-consecutiveDays);
  if (!recent.every((hr) => hr > threshold)) return null;
  return {
    type: 'ELEVATED_HEART_RATE',
    severity: 'WARNING',
    title: 'Frequência cardíaca elevada',
    message: `FC em repouso acima da média nos últimos ${consecutiveDays} dias (limiar: ${Math.round(threshold)} bpm).`,
    metric: 'restingHr',
    value: recent[recent.length - 1],
    threshold: Math.round(threshold),
  };
}

export function checkPerformanceDrop(
  metricLabel: string,
  currentValue: number,
  historicalAvg: number,
  dropThreshold = 0.1,
  higherIsBetter = true,
): AlertTrigger | null {
  if (historicalAvg === 0) return null;
  const change = (currentValue - historicalAvg) / historicalAvg;
  const triggered = higherIsBetter ? change < -dropThreshold : change > dropThreshold;
  if (!triggered) return null;
  return {
    type: 'PERFORMANCE_DROP',
    severity: 'WARNING',
    title: 'Queda de desempenho detectada',
    message: `${metricLabel} caiu ${Math.abs(Math.round(change * 100))}% em relação à média dos últimos 30 dias.`,
    metric: metricLabel,
    value: currentValue,
    threshold: historicalAvg,
  };
}

export function checkInsufficientRecovery(
  recentScores: number[],
  consecutiveDays = 2,
  lowThreshold = 40,
): AlertTrigger | null {
  if (recentScores.length < consecutiveDays) return null;
  const recent = recentScores.slice(-consecutiveDays);
  if (!recent.every((s) => s < lowThreshold)) return null;
  return {
    type: 'INSUFFICIENT_RECOVERY',
    severity: 'WARNING',
    title: 'Recuperação insuficiente',
    message: `Recovery Score abaixo de ${lowThreshold} por ${consecutiveDays} dias consecutivos. Priorize descanso.`,
    metric: 'recoveryScore',
    value: recent[recent.length - 1],
    threshold: lowThreshold,
  };
}

export function checkRapidWeightGain(
  weightHistory: number[],
  days = 7,
  gainThresholdKg = 2.0,
): AlertTrigger | null {
  if (weightHistory.length < 2) return null;
  const recent = weightHistory.slice(-days);
  const gain = recent[recent.length - 1] - recent[0];
  if (gain <= gainThresholdKg) return null;
  return {
    type: 'RAPID_WEIGHT_GAIN',
    severity: 'WARNING',
    title: 'Aumento rápido de peso',
    message: `Ganho de ${gain.toFixed(1)} kg nos últimos ${days} dias.`,
    metric: 'weight',
    value: gain,
    threshold: gainThresholdKg,
  };
}

export function checkProlongedSedentarism(
  activeDays: number[],
  windowDays = 7,
): AlertTrigger | null {
  if (activeDays.length < windowDays) return null;
  if (!activeDays.slice(-windowDays).every((d) => d === 0)) return null;
  return {
    type: 'PROLONGED_SEDENTARISM',
    severity: 'WARNING',
    title: 'Sedentarismo prolongado',
    message: `Nenhuma atividade física registrada nos últimos ${windowDays} dias.`,
    metric: 'activeDays',
    value: 0,
    threshold: 1,
  };
}

export function checkSleepDeficit(
  sleepHoursHistory: number[],
  days = 7,
  targetHours = 8,
  deficitThresholdHours = 5,
): AlertTrigger | null {
  if (sleepHoursHistory.length < days) return null;
  const recent = sleepHoursHistory.slice(-days);
  const totalDeficit = recent.reduce(
    (s, h) => s + Math.max(0, targetHours - h),
    0,
  );
  if (totalDeficit < deficitThresholdHours) return null;
  return {
    type: 'SLEEP_DEFICIT',
    severity: 'WARNING',
    title: 'Déficit de sono acumulado',
    message: `${totalDeficit.toFixed(1)}h de déficit de sono nos últimos ${days} dias.`,
    metric: 'sleepHours',
    value: totalDeficit,
    threshold: deficitThresholdHours,
  };
}

export function checkOvertraining(
  acuteLoad: number,
  chronicLoad: number,
  rampRateThreshold = 1.5,
): AlertTrigger | null {
  if (chronicLoad <= 0) return null;
  const rampRate = acuteLoad / chronicLoad;
  if (rampRate <= rampRateThreshold) return null;
  return {
    type: 'OVERTRAINING',
    severity: 'CRITICAL',
    title: 'Risco de overtraining',
    message: `Carga aguda ${(rampRate * 100).toFixed(0)}% da carga crônica. Aumente o descanso.`,
    metric: 'trainingRampRate',
    value: rampRate,
    threshold: rampRateThreshold,
  };
}
