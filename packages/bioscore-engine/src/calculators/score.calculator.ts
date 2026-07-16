import { clamp } from '../utils/math.utils.js';
import type { HealthScoreInput } from '../interfaces/index.js';

const WEIGHTS = {
  cardio: 0.3,
  body: 0.25,
  sleep: 0.2,
  activity: 0.15,
  consistency: 0.1,
};

export function calculateHealthScore(input: HealthScoreInput): number {
  const components: Array<{ score: number; weight: number }> = [];

  if (input.cardioScore != null)
    components.push({ score: clamp(input.cardioScore, 0, 100), weight: WEIGHTS.cardio });
  if (input.bodyScore != null)
    components.push({ score: clamp(input.bodyScore, 0, 100), weight: WEIGHTS.body });
  if (input.sleepScore != null)
    components.push({ score: clamp(input.sleepScore, 0, 100), weight: WEIGHTS.sleep });
  if (input.activityScore != null)
    components.push({ score: clamp(input.activityScore, 0, 100), weight: WEIGHTS.activity });
  if (input.consistencyScore != null)
    components.push({ score: clamp(input.consistencyScore, 0, 100), weight: WEIGHTS.consistency });

  if (components.length === 0) return 0;

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  return Math.round(
    components.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0),
  );
}

// Activity score based on active sessions per week (target: 5)
export function calculateActivityScore(
  sessionsLastWeek: number,
  targetSessions = 5,
): number {
  return Math.min(100, Math.round((sessionsLastWeek / targetSessions) * 100));
}

// Consistency score based on consecutive active weeks
export function calculateConsistencyScore(activeWeeks: number): number {
  // Full score at 12+ consecutive weeks; linear ramp
  return Math.min(100, Math.round((activeWeeks / 12) * 100));
}
