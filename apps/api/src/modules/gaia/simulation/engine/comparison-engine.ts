export type RiskTrend = 'REDUCTION' | 'STABLE' | 'INCREASE';

export interface SimulationComparisonEntry {
  runId: string;
  scenarioLabel: string;
  timeHorizonLabel: string;
  baselineRiskScore: number;
  simulatedRiskScore: number;
  expectedRiskVariation: number;
  expectedRiskVariationPercent: number;
  confidence: number;
  riskTrend: RiskTrend;
  baselineRiskLevel: string;
  simulatedRiskLevel: string;
}

export interface SimulationComparison {
  entries: SimulationComparisonEntry[];
  bestScenario: string | null;
  worstScenario: string | null;
  averageVariation: number;
  summary: string;
}

export function classifyRiskTrend(variationPoints: number): RiskTrend {
  if (variationPoints <= -2) return 'REDUCTION';
  if (variationPoints >= 2) return 'INCREASE';
  return 'STABLE';
}

export function buildComparisonEntry(
  runId: string,
  result: {
    scenarioLabel: string;
    timeHorizonLabel: string;
    baselineRiskScore: number;
    simulatedRiskScore: number;
    expectedRiskVariation: number;
    expectedRiskVariationPercent: number;
    confidence: number;
    baselineRiskLevel: string;
    simulatedRiskLevel: string;
  },
): SimulationComparisonEntry {
  return {
    runId,
    ...result,
    riskTrend: classifyRiskTrend(result.expectedRiskVariation),
  };
}

export function rankComparisonEntries(entries: SimulationComparisonEntry[]): SimulationComparisonEntry[] {
  return [...entries].sort((a, b) => a.expectedRiskVariation - b.expectedRiskVariation);
}

export function compareSimulations(entries: SimulationComparisonEntry[]): SimulationComparison {
  if (entries.length === 0) {
    return {
      entries: [],
      bestScenario: null,
      worstScenario: null,
      averageVariation: 0,
      summary: 'Nenhuma simulação para comparar.',
    };
  }

  const ranked = rankComparisonEntries(entries);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  const averageVariation = parseFloat(
    (entries.reduce((sum, e) => sum + e.expectedRiskVariation, 0) / entries.length).toFixed(2),
  );

  const reductions = entries.filter((e) => e.riskTrend === 'REDUCTION');
  const increases = entries.filter((e) => e.riskTrend === 'INCREASE');
  const stables = entries.filter((e) => e.riskTrend === 'STABLE');

  const parts: string[] = [];
  if (reductions.length > 0) parts.push(`${reductions.length} cenário(s) com redução estimada de risco`);
  if (stables.length > 0) parts.push(`${stables.length} cenário(s) com variação mínima`);
  if (increases.length > 0) parts.push(`${increases.length} cenário(s) com aumento estimado de risco`);

  return {
    entries: ranked,
    bestScenario: best.expectedRiskVariation < 0 ? best.scenarioLabel : null,
    worstScenario: worst.expectedRiskVariation > 0 ? worst.scenarioLabel : null,
    averageVariation,
    summary: parts.length > 0 ? parts.join('; ') + '.' : 'Variação de risco mínima entre cenários.',
  };
}

export function computeRelativeImpact(
  entries: SimulationComparisonEntry[],
): Array<{ scenarioLabel: string; relativeRank: number; riskTrend: RiskTrend }> {
  const ranked = rankComparisonEntries(entries);
  return ranked.map((e, i) => ({
    scenarioLabel: e.scenarioLabel,
    relativeRank: i + 1,
    riskTrend: e.riskTrend,
  }));
}
