import { Injectable } from '@nestjs/common';
import { PulseHealthScoreService } from './health-score.service.js';
import { PulseRecoveryService } from './recovery.service.js';
import { TrainingLoadService } from './training-load.service.js';
import { TrendsService } from './trends.service.js';
import { PulseAlertsService } from './alerts.service.js';
import { DailyMetricsRepository } from '../repositories/daily-metrics.repository.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly scoreService: PulseHealthScoreService,
    private readonly recoveryService: PulseRecoveryService,
    private readonly loadService: TrainingLoadService,
    private readonly trendsService: TrendsService,
    private readonly alertsService: PulseAlertsService,
    private readonly metricsRepo: DailyMetricsRepository,
  ) {}

  async getDashboard(patientId: string) {
    const [
      todayScore,
      scores7d,
      latestMetrics,
      metrics7d,
      recovery,
      latestLoad,
      trends,
      alerts,
    ] = await Promise.all([
      this.scoreService.getLatest(patientId),
      this.scoreService.getRange(patientId, 7),
      this.metricsRepo.findLatest(patientId),
      this.metricsRepo.findRange(patientId, 7),
      this.recoveryService.compute(patientId),
      this.loadService.getLatest(patientId),
      this.trendsService.computeTrends(patientId, ['7d', '30d']),
      this.alertsService.getAlerts(patientId, true),
    ]);

    const avgScore7d = scores7d.length
      ? Math.round(scores7d.reduce((a, b) => a + b.overall, 0) / scores7d.length)
      : null;

    const avgSteps7d = metrics7d.filter((m) => m.steps !== null).length
      ? Math.round(metrics7d.reduce((a, b) => a + (b.steps ?? 0), 0) / metrics7d.filter((m) => m.steps !== null).length)
      : null;

    const avgSleep7d = metrics7d.filter((m) => m.sleepMinutes !== null).length
      ? Math.round(metrics7d.reduce((a, b) => a + (b.sleepMinutes ?? 0), 0) / metrics7d.filter((m) => m.sleepMinutes !== null).length)
      : null;

    const loadStatus = latestLoad ? this.loadService.classifyStatus(latestLoad.tsb) : null;

    return {
      healthScore: {
        today: todayScore?.overall ?? null,
        trend7d: avgScore7d,
        components: todayScore
          ? {
              sleep: todayScore.sleepScore,
              steps: todayScore.stepsScore,
              exercise: todayScore.exerciseScore,
              heartRate: todayScore.hrScore,
              recovery: todayScore.recoveryScore,
            }
          : null,
      },
      recovery: {
        score: recovery.score,
        classification: recovery.classification,
        recommendation: recovery.recommendation,
        tsb: recovery.tsb,
      },
      activity: {
        stepsToday: latestMetrics?.steps ?? null,
        stepsAvg7d: avgSteps7d,
        stepsGoal: 10_000,
        caloriesToday: latestMetrics?.calories ?? null,
      },
      sleep: {
        lastNightMinutes: latestMetrics?.sleepMinutes ?? null,
        avgMinutes7d: avgSleep7d,
        targetMinutes: 480,
      },
      heartRate: {
        resting: latestMetrics?.restingHr ?? latestMetrics?.avgHeartRate ?? null,
        hrv: latestMetrics?.hrv ?? null,
      },
      weight: {
        latest: latestMetrics?.weight ?? null,
        bodyFat: latestMetrics?.bodyFat ?? null,
      },
      trainingLoad: latestLoad
        ? {
            atl: latestLoad.atl,
            ctl: latestLoad.ctl,
            tsb: latestLoad.tsb,
            status: loadStatus,
            weeklyLoad: latestLoad.weeklyLoad,
            monthlyLoad: latestLoad.monthlyLoad,
          }
        : null,
      trends: trends.slice(0, 16),
      alerts: {
        unreadCount: alerts.length,
        latest: alerts.slice(0, 5),
      },
    };
  }
}
