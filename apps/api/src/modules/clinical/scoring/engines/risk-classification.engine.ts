import type { ScoringEngine, ScoringInput, ScoringResult, RiskLevel } from './scoring-engine.interface';
import { WeightedSumEngine } from './weighted-sum.engine';

interface RiskBand {
  label: string;
  riskLevel: RiskLevel;
  minPercent: number;
  maxPercent: number;
}

const DEFAULT_BANDS: RiskBand[] = [
  { label: 'Risco Crítico',  riskLevel: 'CRITICAL', minPercent: 0,  maxPercent: 20  },
  { label: 'Risco Alto',     riskLevel: 'HIGH',     minPercent: 20, maxPercent: 40  },
  { label: 'Risco Moderado', riskLevel: 'MODERATE', minPercent: 40, maxPercent: 60  },
  { label: 'Risco Baixo',    riskLevel: 'LOW',      minPercent: 60, maxPercent: 80  },
  { label: 'Sem Risco',      riskLevel: 'LOW',      minPercent: 80, maxPercent: 101 },
];

export class RiskClassificationEngine implements ScoringEngine {
  readonly name = 'risk-classification';

  private readonly base = new WeightedSumEngine();

  calculate(input: ScoringInput): ScoringResult {
    const base = this.base.calculate(input);

    const bands: RiskBand[] = (input.config?.riskBands as RiskBand[]) ?? DEFAULT_BANDS;
    const match = bands.find((b) => base.percentage >= b.minPercent && base.percentage < b.maxPercent)
      ?? DEFAULT_BANDS[DEFAULT_BANDS.length - 1];

    return {
      ...base,
      classification: match.label,
      riskLevel: match.riskLevel,
    };
  }
}
