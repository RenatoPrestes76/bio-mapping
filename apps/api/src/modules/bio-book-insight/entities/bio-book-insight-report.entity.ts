import type { PersonalInsight } from './personal-insight.entity.js';
import type { HealthReflection } from './health-reflection.entity.js';
import type { PersonalGoal } from './personal-goal.entity.js';
import type { HealthScorePoint } from './health-score-point.entity.js';
import type { CurrentChapter } from './current-chapter.entity.js';
import type { InsightCategory } from './personal-insight.entity.js';

export class BioBookInsightReport {
  readonly id: string;
  readonly patientId: string;
  readonly insights: PersonalInsight[];
  readonly reflections: HealthReflection[];
  readonly goals: PersonalGoal[];
  readonly scoreEvolution: HealthScorePoint[];
  readonly currentChapter: CurrentChapter | null;
  readonly generatedAt: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    insights: PersonalInsight[];
    reflections: HealthReflection[];
    goals: PersonalGoal[];
    scoreEvolution: HealthScorePoint[];
    currentChapter: CurrentChapter | null;
  }) {
    this.id = params.id ?? `report-${params.patientId}-${Date.now()}`;
    this.patientId = params.patientId;
    this.insights = params.insights;
    this.reflections = params.reflections;
    this.goals = params.goals;
    this.scoreEvolution = [...params.scoreEvolution].sort((a, b) => a.date.getTime() - b.date.getTime());
    this.currentChapter = params.currentChapter;
    this.generatedAt = new Date();
  }

  getInsightsByCategory(category: InsightCategory): PersonalInsight[] {
    return this.insights.filter((i) => i.category === category);
  }

  getStrongInsights(): PersonalInsight[] {
    return this.insights.filter((i) => i.isStrong());
  }

  getLatestScorePoint(): HealthScorePoint | undefined {
    return this.scoreEvolution[this.scoreEvolution.length - 1];
  }

  getEarliestScorePoint(): HealthScorePoint | undefined {
    return this.scoreEvolution[0];
  }

  totalScoreGain(): number {
    const first = this.getEarliestScorePoint();
    const last = this.getLatestScorePoint();
    if (!first || !last) return 0;
    return last.score - first.score;
  }

  getFullJourneyReflection(): HealthReflection | undefined {
    return this.reflections.find((r) => r.period === 'FULL_JOURNEY');
  }

  getCompletedGoals(): PersonalGoal[] {
    return this.goals.filter((g) => g.isCompleted());
  }
}
