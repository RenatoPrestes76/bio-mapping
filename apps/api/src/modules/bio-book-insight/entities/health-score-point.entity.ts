export type ScoreTrend = 'UP' | 'DOWN' | 'STABLE';

export interface ScoreBreakdown {
  adherence: number;
  biomarker: number;
  lifestyle: number;
}

export class HealthScorePoint {
  readonly date: Date;
  readonly label: string;
  readonly score: number;
  readonly breakdown: ScoreBreakdown;
  readonly trend: ScoreTrend;
  readonly delta?: number;

  constructor(params: {
    date: Date;
    label: string;
    score: number;
    breakdown?: Partial<ScoreBreakdown>;
    trend?: ScoreTrend;
    delta?: number;
  }) {
    this.date = params.date;
    this.label = params.label;
    this.score = Math.max(0, Math.min(100, Math.round(params.score)));
    this.breakdown = {
      adherence: params.breakdown?.adherence ?? 0,
      biomarker: params.breakdown?.biomarker ?? 0,
      lifestyle: params.breakdown?.lifestyle ?? 0,
    };
    this.trend = params.trend ?? 'STABLE';
    this.delta = params.delta;
  }

  isImproving(): boolean {
    return this.trend === 'UP';
  }

  isDeclining(): boolean {
    return this.trend === 'DOWN';
  }

  levelLabel(): string {
    if (this.score >= 85) return 'Excelente';
    if (this.score >= 70) return 'Bom';
    if (this.score >= 55) return 'Regular';
    if (this.score >= 40) return 'Atenção';
    return 'Crítico';
  }
}
