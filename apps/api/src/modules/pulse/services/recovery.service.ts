import { Injectable } from '@nestjs/common';
import { DailyMetricsRepository } from '../repositories/daily-metrics.repository.js';
import { TrainingLoadRepository } from '../repositories/training-load.repository.js';

export type RecoveryClassification = 'EXCELENTE' | 'BOA' | 'MODERADA' | 'BAIXA' | 'CRITICA';

export interface RecoveryResult {
  score: number;
  classification: RecoveryClassification;
  recommendation: string;
  components: {
    hrvScore: number;
    hrScore: number;
    sleepScore: number;
    trainingLoadScore: number;
  };
  tsb: number;
}

const WEIGHTS = { hrv: 0.30, hr: 0.25, sleep: 0.25, load: 0.20 };

@Injectable()
export class PulseRecoveryService {
  constructor(
    private readonly metricsRepo: DailyMetricsRepository,
    private readonly loadRepo: TrainingLoadRepository,
  ) {}

  async compute(patientId: string, date?: Date): Promise<RecoveryResult> {
    const targetDate = date ?? new Date();
    const metrics = await this.metricsRepo.findByDate(patientId, targetDate)
      ?? await this.metricsRepo.findLatest(patientId);

    const loadRecord = await this.loadRepo.findLatest(patientId);

    return this.computeFromData(
      metrics?.hrv ?? undefined,
      metrics?.restingHr ?? undefined,
      metrics?.sleepMinutes ?? undefined,
      loadRecord?.tsb ?? undefined,
    );
  }

  computeFromData(
    hrv?: number,
    restingHr?: number,
    sleepMinutes?: number,
    tsb?: number,
  ): RecoveryResult {
    const hrvScore = hrv ? Math.min(100, hrv * 1.4) : 50;
    const hrScore = restingHr ? this.scoreHr(restingHr) : 50;
    const sleepScore = sleepMinutes ? this.scoreSleep(sleepMinutes) : 50;
    const trainingLoadScore = tsb !== undefined ? this.scoreTsb(tsb) : 50;

    const score = Math.round(
      hrvScore * WEIGHTS.hrv +
      hrScore * WEIGHTS.hr +
      sleepScore * WEIGHTS.sleep +
      trainingLoadScore * WEIGHTS.load,
    );

    const classification = this.classify(score);
    const recommendation = this.recommend(classification);

    return {
      score,
      classification,
      recommendation,
      components: { hrvScore, hrScore, sleepScore, trainingLoadScore },
      tsb: tsb ?? 0,
    };
  }

  private scoreHr(rhr: number): number {
    if (rhr < 50) return 100;
    if (rhr < 60) return 85;
    if (rhr < 70) return 70;
    if (rhr < 80) return 55;
    if (rhr < 90) return 40;
    return 25;
  }

  private scoreSleep(minutes: number): number {
    if (minutes >= 480) return 100;
    if (minutes >= 420) return 80;
    if (minutes >= 360) return 60;
    if (minutes >= 300) return 40;
    return 20;
  }

  private scoreTsb(tsb: number): number {
    // TSB > 0 = fresh; TSB < 0 = fatigued
    // Clamp to score: TSB +25 → 100, TSB -30 → 0
    return Math.max(0, Math.min(100, Math.round(50 + tsb * (50 / 25))));
  }

  private classify(score: number): RecoveryClassification {
    if (score >= 80) return 'EXCELENTE';
    if (score >= 65) return 'BOA';
    if (score >= 50) return 'MODERADA';
    if (score >= 35) return 'BAIXA';
    return 'CRITICA';
  }

  private recommend(c: RecoveryClassification): string {
    switch (c) {
      case 'EXCELENTE': return 'Condição ideal para treino intenso.';
      case 'BOA': return 'Boa recuperação. Treino moderado a intenso é adequado.';
      case 'MODERADA': return 'Recuperação parcial. Prefira treino leve ou técnico.';
      case 'BAIXA': return 'Recuperação insuficiente. Priorize descanso ativo.';
      case 'CRITICA': return 'Recuperação crítica. Repouso total recomendado.';
    }
  }
}
