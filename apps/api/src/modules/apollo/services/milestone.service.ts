import { Injectable } from '@nestjs/common';
import { MilestoneStatus } from '@bio/database';
import { MilestoneRepository } from '../repositories/milestone.repository.js';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class MilestoneService {
  constructor(
    private readonly milestoneRepo: MilestoneRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getMilestones(enrollmentId: string) {
    return this.milestoneRepo.findByEnrollment(enrollmentId);
  }

  async getMilestonesForPatient(patientId: string, status?: MilestoneStatus) {
    return this.milestoneRepo.findByPatient(patientId, status);
  }

  async checkAndUpdateMilestones(patientId: string): Promise<number> {
    const milestones = await this.milestoneRepo.findByPatient(patientId, MilestoneStatus.PENDING);
    if (!milestones.length) return 0;

    const latestMetrics = await this.prisma.dailyMetrics.findFirst({
      where: { patientId },
      orderBy: { date: 'desc' },
    });

    const latestWeight = latestMetrics?.weight;
    const latestHr = latestMetrics?.restingHr ?? latestMetrics?.avgHeartRate;
    const latestSleep = latestMetrics?.sleepMinutes;

    const metricMap: Record<string, number | null | undefined> = {
      weight: latestWeight,
      restingHr: latestHr,
      avgHeartRate: latestHr,
      sleepMinutes: latestSleep,
      bloodPressureSystolic: latestMetrics?.bloodPressureSystolic,
    };

    let achieved = 0;

    for (const milestone of milestones) {
      if (!milestone.metric || milestone.targetValue === null || milestone.targetValue === undefined) continue;

      const current = metricMap[milestone.metric];
      if (current === null || current === undefined) continue;

      await this.milestoneRepo.updateProgress(milestone.id, current);

      // For reduction targets (negative targetValue means reduce by that amount)
      // For absolute targets: current <= targetValue (e.g. HR < 130)
      const isAchieved = milestone.targetValue < 0
        ? current <= ((milestone as { startValue?: number }).startValue ?? current) + milestone.targetValue
        : current <= milestone.targetValue;

      if (isAchieved) {
        await this.milestoneRepo.updateProgress(milestone.id, current, MilestoneStatus.ACHIEVED);
        achieved++;
      }
    }

    return achieved;
  }
}
