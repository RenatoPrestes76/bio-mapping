export type PersonalizedRiskLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type LifestyleType = 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'ATHLETE';
export type AlcoholConsumption = 'NONE' | 'OCCASIONAL' | 'MODERATE' | 'HEAVY';

export interface PersonalizedRiskInput {
  baseRiskScore: number;
  familyHistory?: string[];
  lifestyle?: LifestyleType;
  smoking?: boolean;
  alcohol?: AlcoholConsumption;
  bmi?: number;
  age?: number;
  trendSlope?: number;
}

export interface PersonalizedRiskResult {
  baseRiskScore: number;
  familyHistoryAdj: number;
  lifestyleAdj: number;
  trendAdj: number;
  finalRiskScore: number;
  riskLevel: PersonalizedRiskLevel;
  factors: string[];
}

const HIGH_RISK_CONDITIONS = new Set([
  'diabetes', 'hypertension', 'cardiovascular', 'cancer', 'stroke', 'obesity', 'heart_disease',
]);

const LIFESTYLE_ADJUSTMENT: Record<LifestyleType, number> = {
  SEDENTARY: 0.15,
  LIGHTLY_ACTIVE: 0.05,
  MODERATELY_ACTIVE: -0.05,
  VERY_ACTIVE: -0.10,
  ATHLETE: -0.12,
};

const ALCOHOL_ADJUSTMENT: Record<AlcoholConsumption, number> = {
  NONE: 0,
  OCCASIONAL: 0.02,
  MODERATE: 0.05,
  HEAVY: 0.15,
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

export function adjustForFamilyHistory(baseScore: number, familyHistory: string[]): number {
  if (!familyHistory || familyHistory.length === 0) return 0;
  const highRiskCount = familyHistory.filter((h) => HIGH_RISK_CONDITIONS.has(h.toLowerCase())).length;
  return clamp(Math.min(highRiskCount * 0.08, 0.25));
}

export function adjustForLifestyle(lifestyle?: LifestyleType, smoking?: boolean, alcohol?: AlcoholConsumption, bmi?: number): number {
  let adj = 0;
  if (lifestyle) adj += LIFESTYLE_ADJUSTMENT[lifestyle] ?? 0;
  if (smoking) adj += 0.12;
  if (alcohol) adj += ALCOHOL_ADJUSTMENT[alcohol] ?? 0;
  if (bmi != null) {
    if (bmi >= 35) adj += 0.10;
    else if (bmi >= 30) adj += 0.06;
    else if (bmi >= 25) adj += 0.02;
  }
  return clamp(Math.max(-0.15, adj));
}

export function adjustForTrend(trendSlope?: number): number {
  if (trendSlope == null) return 0;
  return clamp(Math.max(-0.10, Math.min(0.15, trendSlope * 0.5)));
}

export function classifyRiskLevel(score: number): PersonalizedRiskLevel {
  if (score < 0.10) return 'VERY_LOW';
  if (score < 0.25) return 'LOW';
  if (score < 0.50) return 'MODERATE';
  if (score < 0.75) return 'HIGH';
  return 'VERY_HIGH';
}

export function calculatePersonalizedRisk(input: PersonalizedRiskInput): PersonalizedRiskResult {
  const familyHistoryAdj = adjustForFamilyHistory(input.baseRiskScore, input.familyHistory ?? []);
  const lifestyleAdj = adjustForLifestyle(input.lifestyle, input.smoking, input.alcohol, input.bmi);
  const trendAdj = adjustForTrend(input.trendSlope);
  const finalRiskScore = clamp(input.baseRiskScore + familyHistoryAdj + lifestyleAdj + trendAdj);
  const riskLevel = classifyRiskLevel(finalRiskScore);

  const factors: string[] = [];
  if (familyHistoryAdj > 0) factors.push(`Histórico familiar (+${Math.round(familyHistoryAdj * 100)}%)`);
  if (input.smoking) factors.push('Tabagismo (+12%)');
  if (input.alcohol === 'HEAVY') factors.push('Consumo elevado de álcool (+15%)');
  if (input.bmi != null && input.bmi >= 30) factors.push(`IMC elevado: ${input.bmi.toFixed(1)}`);
  if (input.lifestyle === 'SEDENTARY') factors.push('Estilo de vida sedentário (+15%)');
  if (trendAdj > 0.05) factors.push('Tendência de piora observada');
  if (lifestyleAdj < -0.05) factors.push('Estilo de vida ativo (protetor)');

  return { baseRiskScore: input.baseRiskScore, familyHistoryAdj, lifestyleAdj, trendAdj, finalRiskScore, riskLevel, factors };
}
