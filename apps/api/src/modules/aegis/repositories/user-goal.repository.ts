import { Injectable } from '@nestjs/common';
import { GoalStatus, GoalType } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class UserGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(patientId: string, type: GoalType, data: {
    target: number;
    unit: string;
    startValue?: number;
    autoAdjust?: boolean;
    notes?: string;
  }) {
    const existing = await this.findActiveByType(patientId, type);
    if (existing) {
      return this.prisma.userGoal.update({
        where: { id: existing.id },
        data: { target: data.target, notes: data.notes, updatedAt: new Date() },
      });
    }
    return this.prisma.userGoal.create({
      data: {
        patientId,
        type,
        target: data.target,
        unit: data.unit,
        startValue: data.startValue,
        autoAdjust: data.autoAdjust ?? true,
        notes: data.notes,
        startDate: new Date(),
      },
    });
  }

  async findActive(patientId: string) {
    return this.prisma.userGoal.findMany({
      where: { patientId, status: GoalStatus.ACTIVE },
      include: { history: { orderBy: { adjustedAt: 'desc' }, take: 3 } },
    });
  }

  async findActiveByType(patientId: string, type: GoalType) {
    return this.prisma.userGoal.findFirst({
      where: { patientId, type, status: GoalStatus.ACTIVE },
    });
  }

  async updateProgress(id: string, currentValue: number, target: number) {
    const progressPct = Math.min(100, (currentValue / target) * 100);
    return this.prisma.userGoal.update({
      where: { id },
      data: { currentValue, progressPct: Math.round(progressPct * 10) / 10 },
    });
  }

  async adjustTarget(id: string, newTarget: number, reason: string, patientId: string, previousTarget: number) {
    const [goal] = await this.prisma.$transaction([
      this.prisma.userGoal.update({
        where: { id },
        data: { target: newTarget, adjustedAt: new Date() },
      }),
      this.prisma.goalHistory.create({
        data: { goalId: id, patientId, previousTarget, newTarget, reason },
      }),
    ]);
    return goal;
  }

  async markAchieved(id: string) {
    return this.prisma.userGoal.update({
      where: { id },
      data: { status: GoalStatus.ACHIEVED, achievedAt: new Date() },
    });
  }
}
