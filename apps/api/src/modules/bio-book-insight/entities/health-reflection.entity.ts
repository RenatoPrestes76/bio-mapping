export type ReflectionPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'FULL_JOURNEY';
export type ReflectionSentiment = 'POSITIVE' | 'NEUTRAL' | 'CHALLENGING';

export class HealthReflection {
  readonly id: string;
  readonly patientId: string;
  readonly period: ReflectionPeriod;
  readonly periodLabel: string;
  readonly fromDate: Date;
  readonly toDate: Date;
  readonly evolution: string;
  readonly challenges: string[];
  readonly achievements: string[];
  readonly nextSteps: string[];
  readonly overallSentiment: ReflectionSentiment;
  readonly eventCount: number;

  constructor(params: {
    id?: string;
    patientId: string;
    period: ReflectionPeriod;
    periodLabel: string;
    fromDate: Date;
    toDate: Date;
    evolution: string;
    challenges?: string[];
    achievements?: string[];
    nextSteps?: string[];
    overallSentiment?: ReflectionSentiment;
    eventCount?: number;
  }) {
    this.id = params.id ?? `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = params.patientId;
    this.period = params.period;
    this.periodLabel = params.periodLabel;
    this.fromDate = params.fromDate;
    this.toDate = params.toDate;
    this.evolution = params.evolution;
    this.challenges = params.challenges ?? [];
    this.achievements = params.achievements ?? [];
    this.nextSteps = params.nextSteps ?? [];
    this.overallSentiment = params.overallSentiment ?? 'NEUTRAL';
    this.eventCount = params.eventCount ?? 0;
  }

  durationDays(): number {
    return Math.ceil((this.toDate.getTime() - this.fromDate.getTime()) / 86_400_000);
  }

  isPositive(): boolean {
    return this.overallSentiment === 'POSITIVE';
  }

  hasChallenges(): boolean {
    return this.challenges.length > 0;
  }

  toSummary(): {
    period: ReflectionPeriod;
    periodLabel: string;
    sentiment: ReflectionSentiment;
    achievementCount: number;
  } {
    return {
      period: this.period,
      periodLabel: this.periodLabel,
      sentiment: this.overallSentiment,
      achievementCount: this.achievements.length,
    };
  }
}
