export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'CRITICAL';

export interface RiskDistribution {
  LOW: number;
  MODERATE: number;
  HIGH: number;
  VERY_HIGH: number;
  CRITICAL: number;
}

export interface RiskDistributionResult {
  counts: RiskDistribution;
  percentages: RiskDistribution;
  total: number;
  meanRisk: number;
}

const RISK_SCORE_MAP: Record<RiskLevel, number> = {
  LOW: 0.15,
  MODERATE: 0.40,
  HIGH: 0.65,
  VERY_HIGH: 0.80,
  CRITICAL: 0.95,
};

export function computeMeanRisk(scores: number[]): number {
  if (scores.length === 0) return 0;
  return parseFloat((scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(3));
}

export function estimateRiskScoreFromLevel(level: RiskLevel): number {
  return RISK_SCORE_MAP[level] ?? 0.3;
}

export function stratifyRiskDistribution(riskLevels: RiskLevel[]): RiskDistributionResult {
  const total = riskLevels.length;
  const counts: RiskDistribution = { LOW: 0, MODERATE: 0, HIGH: 0, VERY_HIGH: 0, CRITICAL: 0 };

  for (const level of riskLevels) {
    if (level in counts) counts[level]++;
  }

  const pct = (n: number) => total > 0 ? parseFloat((n / total * 100).toFixed(1)) : 0;
  const percentages: RiskDistribution = {
    LOW: pct(counts.LOW),
    MODERATE: pct(counts.MODERATE),
    HIGH: pct(counts.HIGH),
    VERY_HIGH: pct(counts.VERY_HIGH),
    CRITICAL: pct(counts.CRITICAL),
  };

  const scores = riskLevels.map(estimateRiskScoreFromLevel);
  const meanRisk = computeMeanRisk(scores);

  return { counts, percentages, total, meanRisk };
}

export function computeRiskTrend(current: number, previous: number): { direction: string; changePp: number } {
  const changePp = parseFloat(((current - previous) * 100).toFixed(2));
  const direction = changePp <= -2 ? 'DECREASING' : changePp >= 2 ? 'INCREASING' : 'STABLE';
  return { direction, changePp };
}

export function computeHighRiskPercentage(riskLevels: RiskLevel[]): number {
  if (riskLevels.length === 0) return 0;
  const highRisk = riskLevels.filter((r) => ['HIGH', 'VERY_HIGH', 'CRITICAL'].includes(r)).length;
  return parseFloat((highRisk / riskLevels.length * 100).toFixed(1));
}
