import { IReasoningStrategy, StrategyOutput } from './reasoning-strategy.interface.js';
import { ReasoningContext, HypothesisCandidate } from '../engine/reasoning-context.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';

export class HybridStrategy implements IReasoningStrategy {
  readonly name = 'HYBRID';
  readonly weight = 1.0;

  apply(context: ReasoningContext): StrategyOutput {
    const start = Date.now();
    const merged = this.mergeAndDeduplicate(context.candidates);

    const step = new ReasoningStep({
      id: `step-hybrid-${Date.now()}`,
      strategyName: this.name,
      description: `Merged ${context.candidates.length} candidates into ${merged.length} deduplicated hypotheses`,
      confidence: 0.90,
      duration: Date.now() - start,
      input: { rawCandidateCount: context.candidates.length },
      output: { mergedCount: merged.length },
    });

    return { candidates: merged, steps: [step], strategyName: this.name, confidence: 0.90 };
  }

  private mergeAndDeduplicate(candidates: HypothesisCandidate[]): HypothesisCandidate[] {
    const byCondition = new Map<string, HypothesisCandidate[]>();

    for (const cand of candidates) {
      const key = cand.condition.toLowerCase().trim();
      const existing = byCondition.get(key) ?? [];
      existing.push(cand);
      byCondition.set(key, existing);
    }

    const merged: HypothesisCandidate[] = [];

    for (const group of byCondition.values()) {
      if (group.length === 1) {
        merged.push(group[0]);
        continue;
      }

      const ruleEntry = group.find((c) => c.strategyName === 'RULE_BASED');
      const base = ruleEntry ?? group[0];

      let totalProbability = base.rawProbability;
      let totalConfidence = base.rawConfidence;
      const allEvidence = [...base.supportingEvidence];
      const allActions = [...base.recommendedActions];
      let boost = 0;

      for (const cand of group) {
        if (cand === base) continue;
        boost += cand.rawProbability * 0.3;
        totalConfidence += cand.rawConfidence;
        allEvidence.push(...cand.supportingEvidence.filter((e) => !allEvidence.includes(e)));
        allActions.push(...cand.recommendedActions.filter((a) => !allActions.includes(a)));
      }

      const avgConfidence = totalConfidence / group.length;

      merged.push({
        condition: base.condition,
        icdCode: base.icdCode,
        rawProbability: Math.min(1, totalProbability + boost),
        rawConfidence: Math.min(1, avgConfidence),
        supportingEvidence: allEvidence,
        contradictingEvidence: base.contradictingEvidence,
        recommendedActions: allActions,
        strategyName: this.name,
      });
    }

    return merged.sort((a, b) => b.rawProbability - a.rawProbability);
  }
}
