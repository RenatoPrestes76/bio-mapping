import { Injectable } from '@nestjs/common';
import { DailyMetricsRepository } from '../repositories/daily-metrics.repository.js';
import { DailyHealthScoreRepository } from '../repositories/daily-health-score.repository.js';

export interface DailyScoreComponents {
  overall: number;
  sleepScore: number;
  stepsScore: number;
  exerciseScore: number;
  hrScore: number;
  recoveryScore: number;
  hydrationScore: number;
}

const SLEEP_TARGET_MIN = 480;
const STEPS_TARGET = 10_000;
const CALORIES_ACTIVE_TARGET = 500;

const WEIGHTS = {
  sleep: 0.25,
  steps: 0.20,
  exercise: 0.20,
  hr: 0.15,
  recovery: 0.15,
  hydration: 0.05,
};

@Injectable()
export class PulseHealthScoreService {
  constructor(
    private readonly metricsRepo: DailyMetricsRepository,
    private readonly scoreRepo: DailyHealthScoreRepository,
  ) {}

  computeComponents(metrics: {
    sleepMinutes?: number | null;
    steps?: number | null;
    calories?: number | null;
    restingHr?: number | null;
    avgHeartRate?: number | null;
    hrv?: number | null;
  }): DailyScoreComponents {
    const sleepScore = this.scoreSleep(metrics.sleepMinutes ?? undefined);
    const stepsScore = this.scoreSteps(metrics.steps ?? undefined);
    const exerciseScore = this.scoreExercise(metrics.calories ?? undefined);
    const hrScore = this.scoreHeartRate(metrics.restingHr ?? metrics.avgHeartRate ?? undefined);
    const recoveryScore = this.scoreRecovery(metrics.hrv ?? undefined, metrics.restingHr ?? undefined);
    const hydrationScore = 50;

    const overall = Math.round(
      sleepScore * WEIGHTS.sleep +
      stepsScore * WEIGHTS.steps +
      exerciseScore * WEIGHTS.exercise +
      hrScore * WEIGHTS.hr +
      recoveryScore * WEIGHTS.recovery +
      hydrationScore * WEIGHTS.hydration,
    );

    return { overall, sleepScore, stepsScore, exerciseScore, hrScore, recoveryScore, hydrationScore };
  }

  async computeAndSave(patientId: string, date: Date) {
    const metrics = await this.metricsRepo.findByDate(patientId, date);
    if (!metrics) return null;

    const components = this.computeComponents(metrics);
    return this.scoreRepo.upsert(patientId, date, components);
  }

  async getLatest(patientId: string) {
    return this.scoreRepo.findLatest(patientId);
  }

  async getRange(patientId: string, days: number) {
    return this.scoreRepo.findRange(patientId, days);
  }

  // ── Scoring functions ─────────────────────────────────────────────────────

  private scoreSleep(minutes?: number): number {
    if (!minutes) return 50;
    if (minutes >= SLEEP_TARGET_MIN) return 100;
    if (minutes >= 420) return 85;
    if (minutes >= 360) return 65;
    if (minutes >= 300) return 45;
    return 25;
  }

  private scoreSteps(steps?: number): number {
    if (!steps) return 50;
    const ratio = steps / STEPS_TARGET;
    return Math.min(100, Math.round(ratio * 100));
  }

  private scoreExercise(calories?: number): number {
    if (!calories) return 50;
    // Score based on active calories above sedentary baseline (~2000 kcal/day)
    const active = Math.max(0, calories - 2000);
    const ratio = active / CALORIES_ACTIVE_TARGET;
    return Math.min(100, Math.round(ratio * 100));
  }

  private scoreHeartRate(restingHr?: number): number {
    if (!restingHr) return 50;
    // Lower resting HR is generally better for cardiovascular fitness
    if (restingHr < 55) return 100;
    if (restingHr < 65) return 85;
    if (restingHr < 75) return 70;
    if (restingHr < 85) return 55;
    if (restingHr < 100) return 40;
    return 25;
  }

  private scoreRecovery(hrv?: number, restingHr?: number): number {
    if (!hrv && !restingHr) return 50;
    const hrvScore = hrv ? Math.min(100, hrv * 1.4) : 50;
    const hrScore = restingHr ? this.scoreHeartRate(restingHr) : 50;
    return Math.round(hrvScore * 0.6 + hrScore * 0.4);
  }
}
