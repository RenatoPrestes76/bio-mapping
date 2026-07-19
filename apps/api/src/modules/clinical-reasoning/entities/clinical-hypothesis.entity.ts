export enum HypothesisPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface ClinicalHypothesisData {
  id: string;
  condition: string;
  icdCode?: string;
  probability: number;
  confidence: number;
  priority?: HypothesisPriority;
  supportingEvidence?: string[];
  contradictingEvidence?: string[];
  recommendedActions?: string[];
}

export class ClinicalHypothesis {
  readonly id: string;
  readonly condition: string;
  readonly icdCode?: string;
  readonly probability: number;
  readonly confidence: number;
  readonly priority: HypothesisPriority;
  readonly supportingEvidence: string[];
  readonly contradictingEvidence: string[];
  readonly recommendedActions: string[];

  constructor(data: ClinicalHypothesisData) {
    this.id = data.id;
    this.condition = data.condition;
    this.icdCode = data.icdCode;
    this.probability = Math.min(1, Math.max(0, data.probability));
    this.confidence = Math.min(1, Math.max(0, data.confidence));
    this.priority = data.priority ?? this.derivePriority(data.probability);
    this.supportingEvidence = data.supportingEvidence ?? [];
    this.contradictingEvidence = data.contradictingEvidence ?? [];
    this.recommendedActions = data.recommendedActions ?? [];
  }

  private derivePriority(probability: number): HypothesisPriority {
    if (probability >= 0.7) return HypothesisPriority.HIGH;
    if (probability >= 0.4) return HypothesisPriority.MEDIUM;
    return HypothesisPriority.LOW;
  }

  isHighPriority(): boolean {
    return this.priority === HypothesisPriority.HIGH;
  }

  overallScore(): number {
    return (this.probability + this.confidence) / 2;
  }
}
