import { Injectable } from '@nestjs/common';
import {
  checkElevatedHr,
  checkInsufficientRecovery,
  checkOvertraining,
  checkPerformanceDrop,
  checkProlongedSedentarism,
  checkRapidWeightGain,
  checkSleepDeficit,
} from '@bio/bioscore-engine';
import { AlertsRepository } from '../repositories/alerts.repository.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { FilterAlertsDto } from '../dto/alert-response.dto.js';

@Injectable()
export class AlertsService {
  constructor(
    private readonly repo: AlertsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async evaluateAndCreate(patientId: string): Promise<number> {
    const [vitals, sleep, recovery, sport] = await Promise.all([
      this.prisma.vitalRecord.findMany({
        where: { patientId, deletedAt: null },
        orderBy: { recordedAt: 'desc' },
        take: 30,
        select: { heartRate: true, weight: true },
      }),
      this.prisma.sleepMetrics.findMany({
        where: { patientId },
        orderBy: { date: 'desc' },
        take: 7,
        select: { totalMinutes: true },
      }),
      this.prisma.recoveryMetrics.findMany({
        where: { patientId },
        orderBy: { recordedAt: 'desc' },
        take: 7,
        select: { recoveryScore: true, acuteLoad: true, chronicLoad: true },
      }),
      this.prisma.sportMetrics.findMany({
        where: { patientId },
        orderBy: { recordedAt: 'desc' },
        take: 7,
        select: { recordedAt: true, activeDays: true },
      }),
    ]);

    const triggers = [];

    // Elevated HR
    const hrValues = vitals
      .filter((v) => v.heartRate != null)
      .map((v) => v.heartRate!)
      .reverse();
    const hrAlert = checkElevatedHr(hrValues);
    if (hrAlert) triggers.push(hrAlert);

    // Sleep deficit
    const sleepHours = sleep.map((s) => (s.totalMinutes ?? 0) / 60).reverse();
    const sleepAlert = checkSleepDeficit(sleepHours);
    if (sleepAlert) triggers.push(sleepAlert);

    // Insufficient recovery
    const recoveryScores = recovery.map((r) => r.recoveryScore).reverse();
    const recovAlert = checkInsufficientRecovery(recoveryScores);
    if (recovAlert) triggers.push(recovAlert);

    // Overtraining
    const latestRecovery = recovery[0];
    if (latestRecovery?.acuteLoad != null && latestRecovery?.chronicLoad != null) {
      const otAlert = checkOvertraining(latestRecovery.acuteLoad, latestRecovery.chronicLoad);
      if (otAlert) triggers.push(otAlert);
    }

    // Rapid weight gain
    const weights = vitals
      .filter((v) => v.weight != null)
      .map((v) => v.weight!)
      .reverse();
    const wgAlert = checkRapidWeightGain(weights);
    if (wgAlert) triggers.push(wgAlert);

    // Prolonged sedentarism (1 = active, 0 = inactive, inferred from sport metrics)
    const since7 = new Date();
    since7.setDate(since7.getDate() - 7);
    const activeDaysMap: number[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const hasSport = sport.some(
        (s) => new Date(s.recordedAt).toDateString() === d.toDateString(),
      );
      return hasSport ? 1 : 0;
    });
    const sedAlert = checkProlongedSedentarism(activeDaysMap);
    if (sedAlert) triggers.push(sedAlert);

    if (triggers.length === 0) return 0;

    // Avoid duplicating unresolved alerts of the same type
    const existingTypes = await this.repo.findUnresolvedTypes(
      patientId,
      triggers.map((t) => t.type),
    );
    const existingTypeSet = new Set(existingTypes.map((e) => e.type));

    const newAlerts = triggers
      .filter((t) => !existingTypeSet.has(t.type as any))
      .map((t) => ({ patientId, ...t }));

    if (newAlerts.length > 0) {
      await this.repo.createMany(newAlerts);
    }

    return newAlerts.length;
  }

  async findAll(patientId: string, dto: FilterAlertsDto = {}) {
    return this.repo.findAll(patientId, {
      unreadOnly: dto.unreadOnly,
      unresolvedOnly: dto.unresolvedOnly,
    });
  }

  async markRead(id: string) {
    return this.repo.markRead(id);
  }

  async resolve(id: string) {
    return this.repo.resolve(id);
  }
}
