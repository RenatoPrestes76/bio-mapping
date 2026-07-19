import { ReasoningContext, HypothesisCandidate } from './reasoning-context.js';
import { IReasoningStrategy, StrategyOutput } from '../strategies/reasoning-strategy.interface.js';

export interface InferenceOutput {
  candidates: HypothesisCandidate[];
  strategyOutputs: StrategyOutput[];
}

export class InferenceEngine {
  private readonly nonHybridStrategies: IReasoningStrategy[];
  private readonly hybridStrategy: IReasoningStrategy | undefined;

  constructor(strategies: IReasoningStrategy[]) {
    this.hybridStrategy = strategies.find((s) => s.name === 'HYBRID');
    this.nonHybridStrategies = strategies.filter((s) => s.name !== 'HYBRID');
  }

  run(context: ReasoningContext): InferenceOutput {
    const strategyOutputs: StrategyOutput[] = [];

    for (const strategy of this.nonHybridStrategies) {
      const output = strategy.apply(context);
      strategyOutputs.push(output);
      context.addCandidates(output.candidates);
      output.steps.forEach((s) => context.addStep(s));
    }

    let finalCandidates = context.candidates;

    if (this.hybridStrategy) {
      const hybridOutput = this.hybridStrategy.apply(context);
      strategyOutputs.push(hybridOutput);
      if (hybridOutput.candidates.length > 0) {
        finalCandidates = hybridOutput.candidates;
      }
      hybridOutput.steps.forEach((s) => context.addStep(s));
    }

    return { candidates: finalCandidates, strategyOutputs };
  }
}
