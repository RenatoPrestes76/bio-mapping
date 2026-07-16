import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { BioScoreRepository } from '../repositories/bioscore.repository.js';
import { AlertsRepository } from '../repositories/alerts.repository.js';
import { TrendAnalysisRepository } from '../repositories/trend-analysis.repository.js';
import { BodyMetricsService } from './body-metrics.service.js';
import { CardioMetricsService } from './cardio-metrics.service.js';
import { SleepMetricsService } from './sleep-metrics.service.js';
import { RecoveryService } from './recovery.service.js';
import { SportMetricsService } from './sport-metrics.service.js';
import { HealthScoreService } from './health-score.service.js';
import { AlertsService } from './alerts.service.js';
import { TrendsService } from './trends.service.js';
import { DashboardService } from './dashboard.service.js';
import {
  calculateAtl,
  calculateCtl,
} from '@bio/bioscore-engine';
import type { Gender, ActivityLevel } from '@bio/bioscore-engine';
import {
  toBioScoreResponse,
  toRecoveryResponse,
} from '../dto/bioscore-response.dto.js';

@Injectable()
export class BioScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bioScoreRepo: BioScoreRepository,
    private readonly bodyMetricsService: BodyMetricsService,
    private readonly cardioMetricsService: CardioMetricsService,
    private readonly sleepMetricsService: SleepMetricsService,
    private readonly recoveryService: RecoveryService,
    private readonly sportMetricsService: SportMetricsService,
    private readonly healthScoreService: HealthScoreService,
    private readonly alertsService: AlertsService,
    private readonly trendsService: TrendsService,
    private readonly dashboardService: DashboardService,
  ) {}

  async computeBioScore(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: { user: true, primaryProfessional: true },
    });
    if (!patient) throw new NotFoundException(`Paciente ${patientId} não encontrado`);

    const user = patient.user;
    const ageYears = user.birthDate
      ? Math.floor(
          (Date.now() - new Date(user.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000),
        )
      : 30;

    const gender = (user.gender as Gender | null) ?? 'OTHER';

    const bio = await this.prisma.biologicalProfile.findUnique({
      where: { userId: user.id },
    });

    const latestVital = await this.prisma.vitalRecord.findFirst({
      where: { patientId, deletedAt: null },
      orderBy: { recordedAt: 'desc' },
    });

    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    let bodyScore = 50;
    let cardioScore = 50;

    if (latestVital?.weight && latestVital?.height) {
      const bodyResult = await this.bodyMetricsService.compute({
        patientId,
        weightKg: latestVital.weight,
        heightCm: latestVital.height,
        ageYears,
        gender: gender === 'OTHER' ? 'MALE' : gender,
        waistCm: latestVital.waistCircumference ?? undefined,
        hipCm: latestVital.hipCircumference ?? undefined,
        neckCm: latestVital.neckCircumference ?? undefined,
        activityLevel: (bio?.activityLevel as ActivityLevel | null) ?? 'SEDENTARY',
        recordedAt: now,
      });
      bodyScore = bodyResult.score;
    }

    if (latestVital?.heartRate) {
      const cardioResult = await this.cardioMetricsService.compute({
        patientId,
        ageYears,
        restingHr: latestVital.heartRate ?? undefined,
        recordedAt: now,
      });
      cardioScore = cardioResult.score;
    }

    const [sleepScores, sleepHours, recentRecoveryScores] = await Promise.all([
      this.sleepMetricsService.getRecentScores(patientId, 7),
      this.sleepMetricsService.getRecentHours(patientId, 7),
      this.recoveryService.getRecentScores(patientId, 7),
    ]);

    const sleepScore =
      sleepScores.length > 0
        ? Math.round(sleepScores.reduce((s, v) => s + v, 0) / sleepScores.length)
        : 50;

    // Training load for recovery
    const sportRecords = await this.prisma.sportMetrics.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'asc' },
      take: 28,
      select: { weeklyLoadPoints: true },
    });
    const loads = sportRecords.map((s) => s.weeklyLoadPoints ?? 0);
    const acuteLoad = loads.length >= 7 ? calculateAtl(loads.slice(-7)) : undefined;
    const chronicLoad = loads.length >= 7 ? calculateCtl(loads) : undefined;

    const avgSleepHours =
      sleepHours.length > 0
        ? sleepHours.reduce((s, v) => s + v, 0) / sleepHours.length
        : undefined;

    const recovery = await this.recoveryService.compute({
      patientId,
      sleepHours: avgSleepHours,
      acuteLoad,
      chronicLoad,
    });

    const activeDays = await this.sportMetricsService.getActiveDaysLastWeek(patientId);
    const totalSessions = await this.sportMetricsService.getTotalSessionsLastWeek(patientId);

    const { healthScore, activityScore, consistencyScore } =
      this.healthScoreService.compute({
        cardioScore,
        bodyScore,
        sleepScore,
        sessionsLastWeek: totalSessions,
        consecutiveActiveWeeks: Math.ceil(activeDays / 7),
      });

    const bioScore = await this.bioScoreRepo.create({
      patientId,
      periodStart,
      periodEnd: now,
      healthScore,
      recoveryScore: recovery.recoveryScore,
      cardioScore,
      bodyScore,
      sleepScore,
      activityScore,
      consistencyScore,
    });

    // Run alert evaluation after score computation
    await this.alertsService.evaluateAndCreate(patientId);
    await this.trendsService.computeForPatient(patientId, 'WEEKLY');

    return toBioScoreResponse(bioScore);
  }

  async findLatest(patientId: string) {
    const record = await this.bioScoreRepo.findLatest(patientId);
    if (!record) return null;
    return toBioScoreResponse(record);
  }

  async findAll(patientId: string) {
    const records = await this.bioScoreRepo.findAll(patientId);
    return records.map(toBioScoreResponse);
  }

  async getDashboard(patientId: string) {
    const [bioScore, recovery, dashboard] = await Promise.all([
      this.bioScoreRepo.findLatest(patientId),
      this.recoveryService.findLatest(patientId),
      this.dashboardService.getDashboard(patientId),
    ]);

    return {
      ...dashboard,
      bioScore: bioScore ? toBioScoreResponse(bioScore) : undefined,
      recovery: recovery ? toRecoveryResponse(recovery) : undefined,
    };
  }
}
