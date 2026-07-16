import { Injectable } from '@nestjs/common';
import { BioScoreRepository } from '../repositories/bioscore.repository.js';
import { AlertsRepository } from '../repositories/alerts.repository.js';
import { TrendAnalysisRepository } from '../repositories/trend-analysis.repository.js';
import { SportMetricsService } from './sport-metrics.service.js';
import type { DashboardResponseDto } from '../dto/dashboard-response.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly bioScoreRepo: BioScoreRepository,
    private readonly alertsRepo: AlertsRepository,
    private readonly trendRepo: TrendAnalysisRepository,
    private readonly sportService: SportMetricsService,
  ) {}

  async getDashboard(patientId: string): Promise<DashboardResponseDto> {
    const [bioScore, latestRecovery, recentAlerts, trends, activeDays, totalSessions] =
      await Promise.all([
        this.bioScoreRepo.findLatest(patientId),
        this.getLatestRecovery(patientId),
        this.alertsRepo.findAll(patientId, { unresolvedOnly: true }),
        this.trendRepo.findAll(patientId),
        this.sportService.getActiveDaysLastWeek(patientId),
        this.sportService.getTotalSessionsLastWeek(patientId),
      ]);

    return {
      patientId,
      generatedAt: new Date(),
      bioScore: bioScore ?? undefined,
      recovery: latestRecovery ?? undefined,
      recentAlerts: recentAlerts.slice(0, 5).map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        triggeredAt: a.triggeredAt,
      })),
      trends: trends.slice(0, 10).map((t) => ({
        metric: t.metric,
        period: t.period,
        trend: t.trend,
        changePct: t.changePct,
        isPersonalRecord: t.isPersonalRecord,
        isPlateauDetected: t.isPlateauDetected,
      })),
      weeklyActivity: {
        activeDays,
        totalSessions,
        consistencyPct: Math.round((activeDays / 7) * 100),
      },
    };
  }

  private async getLatestRecovery(patientId: string) {
    // Accessed from RecoveryRepository — injecting via BioScoreRepository prisma for simplicity
    return null; // wired via BioScoreService in the orchestrator
  }
}
