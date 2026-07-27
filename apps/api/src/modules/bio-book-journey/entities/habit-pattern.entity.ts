export type HabitType =
  | 'MEDICAL_FOLLOW_UP'
  | 'LAB_MONITORING'
  | 'MEDICATION_ADHERENCE'
  | 'LIFESTYLE_TRACKING'
  | 'THERAPEUTIC_ENGAGEMENT';

export type HabitTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'EMERGING';

const HABIT_LABELS: Record<HabitType, string> = {
  MEDICAL_FOLLOW_UP: 'Consultas médicas',
  LAB_MONITORING: 'Monitoramento laboratorial',
  MEDICATION_ADHERENCE: 'Adesão terapêutica',
  LIFESTYLE_TRACKING: 'Rastreamento de estilo de vida',
  THERAPEUTIC_ENGAGEMENT: 'Engajamento terapêutico geral',
};

export class HabitPattern {
  readonly habitType: HabitType;
  readonly label: string;
  readonly trend: HabitTrend;
  readonly consistencyScore: number;
  readonly frequencyPerMonth: number;
  readonly lastObservedAt: Date;
  readonly evidences: string[];
  readonly recommendation: string;

  constructor(params: {
    habitType: HabitType;
    trend: HabitTrend;
    consistencyScore: number;
    frequencyPerMonth: number;
    lastObservedAt: Date;
    evidences?: string[];
    recommendation?: string;
  }) {
    this.habitType = params.habitType;
    this.label = HABIT_LABELS[params.habitType];
    this.trend = params.trend;
    this.consistencyScore = Math.max(0, Math.min(100, Math.round(params.consistencyScore)));
    this.frequencyPerMonth = Math.max(0, params.frequencyPerMonth);
    this.lastObservedAt = params.lastObservedAt;
    this.evidences = params.evidences ?? [];
    this.recommendation = params.recommendation ?? '';
  }

  isHealthy(): boolean {
    return this.consistencyScore >= 60 && (this.trend === 'IMPROVING' || this.trend === 'STABLE');
  }

  needsAttention(): boolean {
    return this.trend === 'DECLINING' || this.consistencyScore < 40;
  }

  isEmerging(): boolean {
    return this.trend === 'EMERGING';
  }

  toSummary(): { habitType: HabitType; label: string; trend: HabitTrend; consistencyScore: number } {
    return { habitType: this.habitType, label: this.label, trend: this.trend, consistencyScore: this.consistencyScore };
  }
}
