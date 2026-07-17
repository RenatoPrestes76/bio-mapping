import { Injectable } from '@nestjs/common';
import { InsightPriority, RecommendationStatus, GoalStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { avg, daysAgo } from '../utils/math.utils.js';

@Injectable()
export class AegisDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(patientId: string) {
    const now = new Date();

    const [insights, recommendations, goals, predictions, metricsLast14d] = await Promise.all([
      this.prisma.healthInsight.findMany({
        where: { patientId, expiresAt: { gt: now } },
        orderBy: { generatedAt: 'desc' },
        take: 10,
      }),
      this.prisma.recommendation.findMany({
        where: { patientId, status: RecommendationStatus.PENDING },
        orderBy: { generatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.userGoal.findMany({
        where: { patientId, status: GoalStatus.ACTIVE },
      }),
      this.prisma.healthPrediction.findMany({
        where: { patientId, expiresAt: { gt: now } },
        orderBy: { generatedAt: 'desc' },
      }),
      this.prisma.dailyMetrics.findMany({
        where: { patientId, date: { gte: daysAgo(14) } },
        orderBy: { date: 'asc' },
      }),
    ]);

    const thisWeek = metricsLast14d.slice(-7);
    const lastWeek = metricsLast14d.slice(0, 7);

    const weeklyEvolution = {
      steps: {
        thisWeek: Math.round(avg(thisWeek.map((m) => m.steps ?? 0))),
        lastWeek: Math.round(avg(lastWeek.map((m) => m.steps ?? 0))),
      },
      sleep: {
        thisWeek: Math.round(avg(thisWeek.map((m) => m.sleepMinutes ?? 0))),
        lastWeek: Math.round(avg(lastWeek.map((m) => m.sleepMinutes ?? 0))),
      },
      calories: {
        thisWeek: Math.round(avg(thisWeek.map((m) => m.calories ?? 0))),
        lastWeek: Math.round(avg(lastWeek.map((m) => m.calories ?? 0))),
      },
      heartRate: {
        thisWeek: Math.round(avg(thisWeek.map((m) => m.restingHr ?? m.avgHeartRate ?? 0).filter(Boolean)) * 10) / 10,
        lastWeek: Math.round(avg(lastWeek.map((m) => m.restingHr ?? m.avgHeartRate ?? 0).filter(Boolean)) * 10) / 10,
      },
    };

    const priorityOrder = {
      [InsightPriority.ALTA_PRIORIDADE]: 4,
      [InsightPriority.IMPORTANTE]: 3,
      [InsightPriority.ATENCAO]: 2,
      [InsightPriority.INFORMATIVO]: 1,
    };

    const sortedInsights = [...insights].sort((a, b) =>
      (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0),
    );

    const riskIndicators = [
      ...sortedInsights.filter((i) =>
        i.priority === InsightPriority.ALTA_PRIORIDADE || i.priority === InsightPriority.IMPORTANTE,
      ),
      ...predictions.filter((p) => p.riskLevel === 'HIGH' || p.riskLevel === 'MEDIUM'),
    ].slice(0, 5);

    return {
      insights: sortedInsights.slice(0, 5),
      recommendations: recommendations.slice(0, 3),
      goals,
      predictions,
      weeklyEvolution,
      riskIndicators,
      generatedAt: now,
    };
  }
}
