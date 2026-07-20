import type { ClinicalRecommendationItem, EvidenceContribution } from '../entities/clinical-decision.entity.js';

export interface SynthesisStrategy {
  name: string;
  priority: number;
  synthesize(
    items: ClinicalRecommendationItem[],
    evidence: EvidenceContribution[],
  ): ClinicalRecommendationItem[];
}

export class EvidenceWeightedSynthesis implements SynthesisStrategy {
  readonly name = 'EVIDENCE_WEIGHTED';
  readonly priority = 1;

  synthesize(
    items: ClinicalRecommendationItem[],
    evidence: EvidenceContribution[],
  ): ClinicalRecommendationItem[] {
    const moduleWeights = new Map<string, number>();
    for (const e of evidence) {
      moduleWeights.set(e.sourceModule, e.confidenceWeight);
    }

    return items.map((item) => {
      const weight = moduleWeights.get(item.sourceModule) ?? 1.0;
      return {
        ...item,
        confidenceContribution: Math.round(item.confidenceContribution * weight),
      };
    }).sort((a, b) => b.confidenceContribution - a.confidenceContribution);
  }
}

export class PriorityFirstSynthesis implements SynthesisStrategy {
  readonly name = 'PRIORITY_FIRST';
  readonly priority = 2;

  private readonly urgencyOrder: Record<string, number> = {
    IMMEDIATE: 4,
    SHORT_TERM: 3,
    LONG_TERM: 2,
    ROUTINE: 1,
  };

  synthesize(
    items: ClinicalRecommendationItem[],
    _evidence: EvidenceContribution[],
  ): ClinicalRecommendationItem[] {
    return [...items].sort((a, b) => {
      const urgencyDiff = (this.urgencyOrder[b.urgency] ?? 0) - (this.urgencyOrder[a.urgency] ?? 0);
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.confidenceContribution - a.confidenceContribution;
    });
  }
}

export class DecisionSynthesisStrategyFactory {
  private strategies: SynthesisStrategy[] = [
    new EvidenceWeightedSynthesis(),
    new PriorityFirstSynthesis(),
  ];

  getStrategy(name: string): SynthesisStrategy | undefined {
    return this.strategies.find((s) => s.name === name);
  }

  getDefault(): SynthesisStrategy {
    return this.strategies.sort((a, b) => a.priority - b.priority)[0];
  }

  apply(
    strategyName: string,
    items: ClinicalRecommendationItem[],
    evidence: EvidenceContribution[],
  ): ClinicalRecommendationItem[] {
    const strategy = this.getStrategy(strategyName) ?? this.getDefault();
    return strategy.synthesize(items, evidence);
  }
}
