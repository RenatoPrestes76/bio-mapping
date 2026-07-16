import { round1, round2 } from '../utils/math.utils.js';
import type { CyclingInput, RunningInput, StrengthInput, SwimmingInput } from '../interfaces/index.js';

// ── Running ────────────────────────────────────────────────────────────────

export function formatPace(secondsPerKm: number): string {
  const min = Math.floor(secondsPerKm / 60);
  const sec = Math.round(secondsPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')} /km`;
}

// Jack Daniels VDOT — estimated from a time trial over a known distance
export function estimateVo2MaxVdot(distanceM: number, timeSeconds: number): number {
  const paceMinPerKm = timeSeconds / 60 / (distanceM / 1000);
  const speedMpm = distanceM / (timeSeconds / 60);
  // VO2 at that pace
  const vo2AtPace =
    -4.6 + 0.182258 * speedMpm + 0.000104 * speedMpm * speedMpm;
  // Fraction of VO2max utilized at that effort (estimated)
  const fractionVo2 =
    0.8 + 0.1894393 * Math.exp(-0.012778 * paceMinPerKm) +
    0.2989558 * Math.exp(-0.1932605 * paceMinPerKm);
  return round1(vo2AtPace / Math.max(fractionVo2, 0.01));
}

// Cooper 12-min test
export function estimateVo2MaxCooper(distanceMeters12Min: number): number {
  return round1((distanceMeters12Min - 504.9) / 44.73);
}

export interface RunningMetrics {
  vo2maxEstimated?: number;
  weeklyLoadPoints?: number;
}

export function computeRunningMetrics(input: RunningInput): RunningMetrics {
  let vo2maxEstimated: number | undefined;
  if (input.recentRaces && input.recentRaces.length > 0) {
    const best = input.recentRaces.reduce((best, race) =>
      estimateVo2MaxVdot(race.distanceM, race.timeSeconds) >
      estimateVo2MaxVdot(best.distanceM, best.timeSeconds)
        ? race
        : best,
    );
    vo2maxEstimated = estimateVo2MaxVdot(best.distanceM, best.timeSeconds);
  }

  const weeklyLoadPoints =
    input.weeklyDistanceM != null
      ? round1(input.weeklyDistanceM / 1000)
      : undefined;

  return { vo2maxEstimated, weeklyLoadPoints };
}

// ── Cycling ────────────────────────────────────────────────────────────────

export function estimateFtp(avgPowerWatts20Min: number): number {
  return Math.round(avgPowerWatts20Min * 0.95);
}

export interface CyclingMetrics {
  estimatedFtpWatts?: number;
}

export function computeCyclingMetrics(input: CyclingInput): CyclingMetrics {
  const estimatedFtpWatts =
    input.power20MinWatts != null
      ? estimateFtp(input.power20MinWatts)
      : undefined;
  return { estimatedFtpWatts };
}

// ── Swimming ───────────────────────────────────────────────────────────────

export function calculateSwolf(
  strokesPerLength: number,
  secondsPerLength: number,
): number {
  return strokesPerLength + secondsPerLength;
}

export interface SwimmingMetrics {
  swolf?: number;
}

export function computeSwimmingMetrics(input: SwimmingInput): SwimmingMetrics {
  const swolf =
    input.strokesPerLength != null && input.secondsPerLength != null
      ? calculateSwolf(input.strokesPerLength, input.secondsPerLength)
      : undefined;
  return { swolf };
}

// ── Strength ───────────────────────────────────────────────────────────────

export function calculateWeeklyTonnage(
  sets: Array<{ reps: number; weightKg: number }>,
): number {
  return round2(sets.reduce((s, set) => s + set.reps * set.weightKg, 0));
}

export function calculateLoadProgression(
  currentTonnage: number,
  previousTonnage: number,
): number {
  if (previousTonnage <= 0) return 0;
  return round1(((currentTonnage - previousTonnage) / previousTonnage) * 100);
}

export interface StrengthMetrics {
  weeklyTonnageKg?: number;
  loadProgressionPct?: number;
}

export function computeStrengthMetrics(input: StrengthInput): StrengthMetrics {
  if (!input.sets || input.sets.length === 0) return {};
  const weeklyTonnageKg = calculateWeeklyTonnage(input.sets);
  const loadProgressionPct =
    input.previousTonnageKg != null
      ? calculateLoadProgression(weeklyTonnageKg, input.previousTonnageKg)
      : undefined;
  return { weeklyTonnageKg, loadProgressionPct };
}
