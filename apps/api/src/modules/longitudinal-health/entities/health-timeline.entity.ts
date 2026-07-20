import type { ClinicalEvent } from './clinical-event.entity.js';
import type { BiomarkerTrend } from './biomarker-trend.entity.js';

export type DiseaseStage = string;
export type TherapeuticResponseType = 'EXCELLENT' | 'PARTIAL' | 'NONE' | 'INCONSISTENT' | 'UNKNOWN';

export interface DiseaseProgression {
  condition: string;
  icdCode?: string;
  history: Array<{ date: Date; stage: DiseaseStage; notes?: string }>;
  currentStage: DiseaseStage;
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING' | 'UNKNOWN';
  onsetDate?: Date;
}

export interface TherapeuticResponse {
  drug: string;
  startDate: Date;
  responseType: TherapeuticResponseType;
  biomarkersBefore: Record<string, number>;
  biomarkersAfter: Record<string, number>;
  evaluationPeriodDays: number;
  notes?: string;
}

export interface RiskEvolutionPoint {
  date: Date;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  contributingFactors: string[];
}

export interface TimelineAnalytics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  progressionVelocity: number;
  meanDaysBetweenEvents: number;
  estimatedAdherence: number;
  clinicalStability: number;
  metabolicTrend: 'IMPROVING' | 'STABLE' | 'WORSENING' | 'MIXED' | 'UNKNOWN';
  cardiovascularTrend: 'IMPROVING' | 'STABLE' | 'WORSENING' | 'MIXED' | 'UNKNOWN';
  longestGapDays: number;
  mostFrequentEventType: string;
}

export class HealthTimeline {
  readonly id: string;
  readonly patientId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly events: ClinicalEvent[];
  readonly biomarkerTrends: BiomarkerTrend[];
  readonly diseaseProgressions: DiseaseProgression[];
  readonly therapeuticResponses: TherapeuticResponse[];
  readonly riskEvolution: RiskEvolutionPoint[];
  readonly analytics: TimelineAnalytics;
  readonly generatedAt: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    startDate: Date;
    endDate: Date;
    events: ClinicalEvent[];
    biomarkerTrends?: BiomarkerTrend[];
    diseaseProgressions?: DiseaseProgression[];
    therapeuticResponses?: TherapeuticResponse[];
    riskEvolution?: RiskEvolutionPoint[];
    analytics: TimelineAnalytics;
  }) {
    this.id = params.id ?? `timeline-${params.patientId}-${Date.now()}`;
    this.patientId = params.patientId;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.events = [...params.events].sort((a, b) => a.date.getTime() - b.date.getTime());
    this.biomarkerTrends = params.biomarkerTrends ?? [];
    this.diseaseProgressions = params.diseaseProgressions ?? [];
    this.therapeuticResponses = params.therapeuticResponses ?? [];
    this.riskEvolution = params.riskEvolution ?? [];
    this.analytics = params.analytics;
    this.generatedAt = new Date();
  }

  getEventsByType(type: ClinicalEvent['eventType']): ClinicalEvent[] {
    return this.events.filter((e) => e.eventType === type);
  }

  getEventsInRange(start: Date, end: Date): ClinicalEvent[] {
    return this.events.filter((e) => e.date >= start && e.date <= end);
  }

  getSignificantEvents(): ClinicalEvent[] {
    return this.events.filter((e) => e.isClinicallySignificant());
  }

  getTrendForMarker(marker: string): BiomarkerTrend | undefined {
    return this.biomarkerTrends.find((t) => t.marker.toLowerCase() === marker.toLowerCase());
  }

  getProgressionForCondition(condition: string): DiseaseProgression | undefined {
    return this.diseaseProgressions.find(
      (p) => p.condition.toLowerCase() === condition.toLowerCase(),
    );
  }

  hasWorseningTrends(): boolean {
    return this.biomarkerTrends.some((t) => t.isWorsening());
  }

  hasImprovingTrends(): boolean {
    return this.biomarkerTrends.some((t) => t.isImproving());
  }

  getLatestRiskScore(): RiskEvolutionPoint | undefined {
    return this.riskEvolution.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  }

  spanDays(): number {
    return Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / 86_400_000);
  }
}
