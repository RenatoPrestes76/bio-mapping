import { Injectable } from '@nestjs/common';
import { AlertSeverity, AlertType } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { DailyMetricsRepository } from '../repositories/daily-metrics.repository.js';
import { TrainingLoadRepository } from '../repositories/training-load.repository.js';

interface AlertCandidate {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

const THRESHOLDS = {
  activityDropPct: 0.50,   // 50% drop in steps triggers alert
  sleepMinTarget: 360,     // 6h minimum
  sleepDeclineDays: 5,
  hrTrendDays: 7,
  hrTrendBpmRise: 5,
  trainingOverloadTsb: -30,
  syncAbsenceDays: 5,
  activityDropDays: 3,
};

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function linearSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = avg(values);
  let num = 0, den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

@Injectable()
export class PulseAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsRepo: DailyMetricsRepository,
    private readonly loadRepo: TrainingLoadRepository,
  ) {}

  async evaluateAndCreate(patientId: string): Promise<number> {
    const last30 = await this.metricsRepo.findRange(patientId, 30);
    const loadRecord = await this.loadRepo.findLatest(patientId);

    const candidates: AlertCandidate[] = [
      ...this.checkActivityDrop(last30),
      ...this.checkPersistentSleepDecline(last30),
      ...this.checkHrElevationTrend(last30),
      ...this.checkTrainingOverload(loadRecord?.tsb),
    ];

    // Check sync absence via health sources
    const syncAlerts = await this.checkSyncAbsence(patientId);
    candidates.push(...syncAlerts);

    // Dedup: skip if same type already has unresolved alert
    let created = 0;
    for (const c of candidates) {
      const existing = await this.prisma.alert.findFirst({
        where: { patientId, type: c.type, isResolved: false },
      });
      if (!existing) {
        await this.prisma.alert.create({
          data: { patientId, ...c },
        });
        created++;
      }
    }
    return created;
  }

  async getAlerts(patientId: string, onlyUnread = false) {
    return this.prisma.alert.findMany({
      where: { patientId, ...(onlyUnread ? { isRead: false } : {}) },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
    });
  }

  async markRead(alertId: string) {
    return this.prisma.alert.update({ where: { id: alertId }, data: { isRead: true } });
  }

  // ── Alert checkers ────────────────────────────────────────────────────────

  private checkActivityDrop(metrics: Array<{ steps?: number | null; date: Date }>): AlertCandidate[] {
    const stepsData = metrics.map((m) => m.steps ?? 0);
    if (stepsData.length < 10) return [];

    const recent = stepsData.slice(-THRESHOLDS.activityDropDays);
    const baseline = stepsData.slice(-14, -THRESHOLDS.activityDropDays);
    if (!baseline.length) return [];

    const recentAvg = avg(recent);
    const baselineAvg = avg(baseline);
    if (baselineAvg === 0) return [];

    const drop = (baselineAvg - recentAvg) / baselineAvg;
    if (drop >= THRESHOLDS.activityDropPct) {
      return [{
        type: AlertType.ACTIVITY_DROP,
        severity: AlertSeverity.WARNING,
        title: 'Queda acentuada de atividade física',
        message: `Seus passos caíram ${Math.round(drop * 100)}% nos últimos ${THRESHOLDS.activityDropDays} dias comparado à semana anterior.`,
        metric: 'steps',
        value: recentAvg,
        threshold: baselineAvg * (1 - THRESHOLDS.activityDropPct),
      }];
    }
    return [];
  }

  private checkPersistentSleepDecline(metrics: Array<{ sleepMinutes?: number | null }>): AlertCandidate[] {
    const recent = metrics.slice(-THRESHOLDS.sleepDeclineDays);
    const lowNights = recent.filter((m) => (m.sleepMinutes ?? 0) < THRESHOLDS.sleepMinTarget && m.sleepMinutes !== null);
    if (lowNights.length >= THRESHOLDS.sleepDeclineDays) {
      const avgSleep = avg(lowNights.map((m) => m.sleepMinutes ?? 0));
      return [{
        type: AlertType.PERSISTENT_SLEEP_DECLINE,
        severity: AlertSeverity.WARNING,
        title: 'Piora persistente do sono',
        message: `Você dormiu menos de 6h em ${THRESHOLDS.sleepDeclineDays} noites consecutivas (média: ${Math.round(avgSleep / 60 * 10) / 10}h).`,
        metric: 'sleepMinutes',
        value: avgSleep,
        threshold: THRESHOLDS.sleepMinTarget,
      }];
    }
    return [];
  }

  private checkHrElevationTrend(metrics: Array<{ restingHr?: number | null; avgHeartRate?: number | null }>): AlertCandidate[] {
    const recent = metrics.slice(-THRESHOLDS.hrTrendDays);
    const hrValues = recent
      .map((m) => m.restingHr ?? m.avgHeartRate)
      .filter((v): v is number => v !== null && v !== undefined);

    if (hrValues.length < 5) return [];

    const slope = linearSlope(hrValues);
    const rise = slope * (hrValues.length - 1);

    if (rise >= THRESHOLDS.hrTrendBpmRise && slope > 0) {
      return [{
        type: AlertType.HR_ELEVATION_TREND,
        severity: AlertSeverity.WARNING,
        title: 'Aumento contínuo da frequência cardíaca',
        message: `Sua FC de repouso aumentou ~${Math.round(rise)} bpm nos últimos ${THRESHOLDS.hrTrendDays} dias.`,
        metric: 'restingHr',
        value: hrValues[hrValues.length - 1],
        threshold: hrValues[0],
      }];
    }
    return [];
  }

  private checkTrainingOverload(tsb?: number): AlertCandidate[] {
    if (tsb !== undefined && tsb < THRESHOLDS.trainingOverloadTsb) {
      return [{
        type: AlertType.TRAINING_OVERLOAD,
        severity: AlertSeverity.CRITICAL,
        title: 'Carga excessiva de treino',
        message: `Seu Training Stress Balance é ${Math.round(tsb)}, indicando risco de overtraining. Considere reduzir a intensidade.`,
        metric: 'tsb',
        value: tsb,
        threshold: THRESHOLDS.trainingOverloadTsb,
      }];
    }
    return [];
  }

  private async checkSyncAbsence(patientId: string): Promise<AlertCandidate[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - THRESHOLDS.syncAbsenceDays);

    const staleSources = await this.prisma.healthSource.findMany({
      where: {
        patientId,
        status: 'CONNECTED',
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: cutoff } },
        ],
      },
    });

    if (staleSources.length > 0) {
      const platforms = staleSources.map((s) => s.platform).join(', ');
      return [{
        type: AlertType.SYNC_ABSENCE,
        severity: AlertSeverity.INFO,
        title: 'Sincronização ausente',
        message: `${platforms} não sincroniza há mais de ${THRESHOLDS.syncAbsenceDays} dias. Abra o app para sincronizar.`,
        metric: 'lastSyncAt',
      }];
    }
    return [];
  }
}
