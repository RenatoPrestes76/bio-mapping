export interface PredictedOutcome {
  metric: string;
  currentValue: number;
  predictedValue: number;
  unit?: string;
  timeframeWeeks: number;
  confidence: number;
  changePercent?: number;
}

export interface RiskChange {
  riskType: string;
  currentLevel: string;
  predictedLevel: string;
  delta: number;
  direction: 'IMPROVED' | 'WORSENED' | 'STABLE';
}

export interface SimulationResultData {
  id?: string;
  scenarioId: string;
  predictedOutcomes: PredictedOutcome[];
  riskChanges: RiskChange[];
  recommendations: string[];
  confidence: number;
  limitations?: string[];
  processingTime: number;
  createdAt?: Date;
}

export class SimulationResult {
  readonly id: string;
  readonly scenarioId: string;
  readonly predictedOutcomes: PredictedOutcome[];
  readonly riskChanges: RiskChange[];
  readonly recommendations: string[];
  readonly confidence: number;
  readonly limitations: string[];
  readonly processingTime: number;
  readonly createdAt: Date;

  constructor(data: SimulationResultData) {
    this.id = data.id ?? `result-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.scenarioId = data.scenarioId;
    this.predictedOutcomes = data.predictedOutcomes;
    this.riskChanges = data.riskChanges;
    this.recommendations = data.recommendations;
    this.confidence = Math.min(1, Math.max(0, data.confidence));
    this.limitations = data.limitations ?? [];
    this.processingTime = Math.max(0, data.processingTime);
    this.createdAt = data.createdAt ?? new Date();
  }

  hasImprovedOutcomes(): boolean {
    return this.riskChanges.some((rc) => rc.direction === 'IMPROVED');
  }

  hasWorsenedOutcomes(): boolean {
    return this.riskChanges.some((rc) => rc.direction === 'WORSENED');
  }

  getAverageConfidence(): number {
    if (this.predictedOutcomes.length === 0) return this.confidence;
    const sum = this.predictedOutcomes.reduce((acc, o) => acc + o.confidence, 0);
    return sum / this.predictedOutcomes.length;
  }

  getTopRecommendations(n: number): string[] {
    return this.recommendations.slice(0, n);
  }
}
