import type { JourneyPath } from './journey-path.entity.js';
import type { AdaptiveRecommendation, RecommendationPriority } from './adaptive-recommendation.entity.js';
import type { HabitPattern } from './habit-pattern.entity.js';
import type { MilestonePrediction } from './milestone-prediction.entity.js';

export class JourneyReport {
  readonly id: string;
  readonly patientId: string;
  readonly journeyPath: JourneyPath;
  readonly recommendations: AdaptiveRecommendation[];
  readonly habitPatterns: HabitPattern[];
  readonly milestonePredictions: MilestonePrediction[];
  readonly generatedAt: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    journeyPath: JourneyPath;
    recommendations: AdaptiveRecommendation[];
    habitPatterns: HabitPattern[];
    milestonePredictions: MilestonePrediction[];
  }) {
    this.id = params.id ?? `journey-${params.patientId}-${Date.now()}`;
    this.patientId = params.patientId;
    this.journeyPath = params.journeyPath;
    this.recommendations = [...params.recommendations].sort((a, b) => {
      const order: Record<RecommendationPriority, number> = { IMMEDIATE: 0, SHORT_TERM: 1, LONG_TERM: 2 };
      return order[a.priority] - order[b.priority];
    });
    this.habitPatterns = params.habitPatterns;
    this.milestonePredictions = params.milestonePredictions;
    this.generatedAt = new Date();
  }

  getImmediateRecommendations(): AdaptiveRecommendation[] {
    return this.recommendations.filter((r) => r.priority === 'IMMEDIATE');
  }

  getHealthyHabits(): HabitPattern[] {
    return this.habitPatterns.filter((h) => h.isHealthy());
  }

  getHabitsNeedingAttention(): HabitPattern[] {
    return this.habitPatterns.filter((h) => h.needsAttention());
  }

  getHighConfidencePredictions(): MilestonePrediction[] {
    return this.milestonePredictions.filter((p) => p.isHighConfidence());
  }

  getNextStep(): string {
    const immediate = this.getImmediateRecommendations();
    if (immediate.length > 0) return immediate[0].title;
    const nextPhase = this.journeyPath.getNextPhase();
    if (nextPhase) return `Avançar para: ${nextPhase.label}`;
    return 'Manter acompanhamento e registros atualizados.';
  }
}
