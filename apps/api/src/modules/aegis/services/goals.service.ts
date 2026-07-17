import { Injectable } from '@nestjs/common';
import { GoalStatus, GoalType } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { UserGoalRepository } from '../repositories/user-goal.repository.js';
import { avg, daysAgo } from '../utils/math.utils.js';

interface DefaultGoal {
  type: GoalType;
  target: number;
  unit: string;
}

const DEFAULT_GOALS: DefaultGoal[] = [
  { type: GoalType.DAILY_STEPS, target: 8000, unit: 'steps' },
  { type: GoalType.SLEEP_DURATION, target: 480, unit: 'minutes' },
  { type: GoalType.WEEKLY_TRAINING_SESSIONS, target: 3, unit: 'sessions' },
];

export interface AdjustmentResult {
  type: GoalType;
  from: number;
  to: number;
  reason: string;
}

export interface GoalProgress {
  goalId: string;
  type: GoalType;
  target: number;
  currentValue: number | null;
  progressPct: number | null;
  status: GoalStatus;
  unit: string;
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalRepo: UserGoalRepository,
  ) {}

  async initializeGoals(patientId: string): Promise<void> {
    for (const def of DEFAULT_GOALS) {
      const existing = await this.goalRepo.findActiveByType(patientId, def.type);
      if (!existing) {
        await this.goalRepo.upsert(patientId, def.type, {
          target: def.target,
          unit: def.unit,
          startValue: def.target,
        });
      }
    }
  }

  async getGoals(patientId: string) {
    return this.goalRepo.findActive(patientId);
  }

  async setGoal(patientId: string, type: GoalType, target: number, notes?: string): Promise<ReturnType<typeof this.goalRepo.upsert>> {
    const unitMap: Record<GoalType, string> = {
      [GoalType.DAILY_STEPS]: 'steps',
      [GoalType.SLEEP_DURATION]: 'minutes',
      [GoalType.WEEKLY_TRAINING_SESSIONS]: 'sessions',
      [GoalType.WEIGHT]: 'kg',
      [GoalType.BODY_FAT]: '%',
      [GoalType.RESTING_HR]: 'bpm',
      [GoalType.HRV]: 'ms',
      [GoalType.WEEKLY_CALORIES]: 'kcal',
    };
    return this.goalRepo.upsert(patientId, type, { target, unit: unitMap[type] ?? 'units', notes });
  }

  async autoAdjustGoals(patientId: string): Promise<AdjustmentResult[]> {
    const goals = await this.prisma.userGoal.findMany({
      where: { patientId, status: GoalStatus.ACTIVE, autoAdjust: true },
    });

    const metrics = await this.prisma.dailyMetrics.findMany({
      where: { patientId, date: { gte: daysAgo(14) } },
      orderBy: { date: 'asc' },
    });

    const results: AdjustmentResult[] = [];

    for (const goal of goals) {
      if (goal.type === GoalType.DAILY_STEPS) {
        const stepsValues = metrics.map((m) => m.steps ?? 0).filter((v) => v > 0);
        if (stepsValues.length < 7) continue;

        const avg7d = avg(stepsValues.slice(-7));

        await this.goalRepo.updateProgress(goal.id, Math.round(avg7d), goal.target);

        if (avg7d > goal.target * 1.1) {
          const newTarget = Math.round((goal.target + 1000) / 500) * 500;
          await this.goalRepo.adjustTarget(goal.id, newTarget, 'Meta superada consistentemente — aumentando desafio', patientId, goal.target);
          results.push({ type: goal.type, from: goal.target, to: newTarget, reason: 'Progresso acima da meta' });
        } else if (avg7d < goal.target * 0.6 && avg7d > 0) {
          const newTarget = Math.max(3000, Math.round((avg7d * 1.15) / 500) * 500);
          if (newTarget < goal.target) {
            await this.goalRepo.adjustTarget(goal.id, newTarget, 'Meta muito distante da performance atual — ajustando para nível alcançável', patientId, goal.target);
            results.push({ type: goal.type, from: goal.target, to: newTarget, reason: 'Meta ajustada para nível atingível' });
          }
        }
      }

      if (goal.type === GoalType.SLEEP_DURATION) {
        const sleepValues = metrics.map((m) => m.sleepMinutes ?? 0).filter((v) => v > 0);
        if (sleepValues.length < 5) continue;
        const avg7d = avg(sleepValues.slice(-7));
        await this.goalRepo.updateProgress(goal.id, Math.round(avg7d), goal.target);
      }

      if (goal.type === GoalType.RESTING_HR) {
        const hrValues = metrics.map((m) => m.restingHr ?? m.avgHeartRate).filter((v): v is number => v !== null && v !== undefined);
        if (hrValues.length < 5) continue;
        const avgHr = avg(hrValues.slice(-7));
        await this.goalRepo.updateProgress(goal.id, Math.round(avgHr * 10) / 10, goal.target);
        if (avgHr <= goal.target) {
          await this.goalRepo.markAchieved(goal.id);
        }
      }
    }

    return results;
  }

  async evaluateProgress(patientId: string): Promise<GoalProgress[]> {
    const goals = await this.goalRepo.findActive(patientId);
    return goals.map((g) => ({
      goalId: g.id,
      type: g.type,
      target: g.target,
      currentValue: g.currentValue ?? null,
      progressPct: g.progressPct ?? null,
      status: g.status,
      unit: g.unit,
    }));
  }
}
