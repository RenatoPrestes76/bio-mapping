import { Injectable } from '@nestjs/common';
import type { ScoringEngine, ScoringInput, ScoringResult } from '../engines/scoring-engine.interface';
import { WeightedSumEngine } from '../engines/weighted-sum.engine';
import { PercentageEngine } from '../engines/percentage.engine';
import { RiskClassificationEngine } from '../engines/risk-classification.engine';

@Injectable()
export class ScoringService {
  private readonly engines: Map<string, ScoringEngine> = new Map([
    ['weighted-sum',        new WeightedSumEngine()],
    ['percentage',          new PercentageEngine()],
    ['risk-classification', new RiskClassificationEngine()],
  ]);

  calculate(engineName: string, input: ScoringInput): ScoringResult {
    const engine = this.engines.get(engineName) ?? this.engines.get('weighted-sum')!;
    return engine.calculate(input);
  }

  listEngines(): string[] {
    return Array.from(this.engines.keys());
  }
}
