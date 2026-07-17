import { Injectable } from '@nestjs/common';
import { calculateAtl, calculateCtl } from '@bio/bioscore-engine';
import { DailyMetricsRepository } from '../repositories/daily-metrics.repository.js';
import { TrainingLoadRepository } from '../repositories/training-load.repository.js';

export type LoadStatus = 'FRESH' | 'OPTIMAL' | 'ACCUMULATED' | 'OVERREACHING' | 'OVERTRAINING';

@Injectable()
export class TrainingLoadService {
  constructor(
    private readonly metricsRepo: DailyMetricsRepository,
    private readonly loadRepo: TrainingLoadRepository,
  ) {}

  async computeAndSave(patientId: string, date: Date) {
    const last30 = await this.metricsRepo.findRange(patientId, 30, date);

    // Convert daily calories to training load points
    // ~40 kcal above resting = 1 load point; baseline 2000 kcal/day
    const loads = last30.map((d) => Math.max(0, ((d.calories ?? 2000) - 2000) / 40));

    const dailyLoad = loads[loads.length - 1] ?? 0;
    const weeklyLoad = loads.slice(-7).reduce((a, b) => a + b, 0);
    const monthlyLoad = loads.reduce((a, b) => a + b, 0);
    const atl = calculateAtl(loads);
    const ctl = calculateCtl(loads);
    const tsb = ctl - atl;

    return this.loadRepo.upsert(patientId, date, {
      dailyLoad: Math.round(dailyLoad * 10) / 10,
      weeklyLoad: Math.round(weeklyLoad * 10) / 10,
      monthlyLoad: Math.round(monthlyLoad * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      ctl: Math.round(ctl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
    });
  }

  async getLatest(patientId: string) {
    return this.loadRepo.findLatest(patientId);
  }

  async getRange(patientId: string, days: number) {
    return this.loadRepo.findRange(patientId, days);
  }

  classifyStatus(tsb: number): LoadStatus {
    if (tsb > 20) return 'FRESH';
    if (tsb >= 0) return 'OPTIMAL';
    if (tsb >= -10) return 'ACCUMULATED';
    if (tsb >= -30) return 'OVERREACHING';
    return 'OVERTRAINING';
  }
}
