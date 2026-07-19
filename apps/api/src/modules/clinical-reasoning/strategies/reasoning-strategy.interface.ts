import { ReasoningContext, HypothesisCandidate } from '../engine/reasoning-context.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';

export type { HypothesisCandidate };

export interface StrategyOutput {
  candidates: HypothesisCandidate[];
  steps: ReasoningStep[];
  strategyName: string;
  confidence: number;
}

export interface IReasoningStrategy {
  readonly name: string;
  readonly weight: number;
  apply(context: ReasoningContext): StrategyOutput;
}
