import { Injectable } from '@nestjs/common';
import {
  calculateActivityScore,
  calculateConsistencyScore,
  calculateHealthScore,
} from '@bio/bioscore-engine';

export interface HealthScoreContext {
  cardioScore?: number;
  bodyScore?: number;
  sleepScore?: number;
  sessionsLastWeek?: number;
  consecutiveActiveWeeks?: number;
}

@Injectable()
export class HealthScoreService {
  compute(ctx: HealthScoreContext): {
    healthScore: number;
    activityScore: number;
    consistencyScore: number;
  } {
    const activityScore = calculateActivityScore(ctx.sessionsLastWeek ?? 0);
    const consistencyScore = calculateConsistencyScore(ctx.consecutiveActiveWeeks ?? 0);

    const healthScore = calculateHealthScore({
      cardioScore: ctx.cardioScore,
      bodyScore: ctx.bodyScore,
      sleepScore: ctx.sleepScore,
      activityScore,
      consistencyScore,
    });

    return { healthScore, activityScore, consistencyScore };
  }
}
