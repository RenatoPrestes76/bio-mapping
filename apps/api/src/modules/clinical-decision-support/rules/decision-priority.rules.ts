import type { DecisionPriority, ClinicalRecommendationItem } from '../entities/clinical-decision.entity.js';

export interface PrioritySignals {
  hasContradications: boolean;
  hasUltraRapidMetabolizer: boolean;
  hasPoorMetabolizer: boolean;
  hasPathogenicVariant: boolean;
  hasLikelyPathogenicVariant: boolean;
  immediateActionCount: number;
  highRiskDrugCount: number;
}

export function computeDecisionPriority(signals: PrioritySignals): DecisionPriority {
  if (signals.hasContradications || signals.hasPathogenicVariant) return 'CRITICAL';
  if (
    signals.hasUltraRapidMetabolizer ||
    signals.hasPoorMetabolizer ||
    signals.hasLikelyPathogenicVariant ||
    signals.immediateActionCount > 0 ||
    signals.highRiskDrugCount >= 2
  ) {
    return 'HIGH';
  }
  if (signals.highRiskDrugCount === 1) return 'MODERATE';
  return 'LOW';
}

export function computeRecommendationUrgency(
  rec: Partial<ClinicalRecommendationItem>,
): ClinicalRecommendationItem['urgency'] {
  if (rec.contraindications && rec.contraindications.length > 0) return 'IMMEDIATE';
  const action = (rec.action ?? '').toLowerCase();
  if (action.includes('contraindicated') || action.includes('avoid') || action.includes('stop')) return 'IMMEDIATE';
  if (action.includes('reduce') || action.includes('caution') || action.includes('monitor')) return 'SHORT_TERM';
  if (action.includes('consider') || action.includes('alternative')) return 'LONG_TERM';
  return 'ROUTINE';
}

export const MODULE_PRIORITY_WEIGHT: Record<string, number> = {
  pharmacogenomics: 25,
  genomic: 20,
  'clinical-reasoning': 20,
  'personalized-medicine': 15,
  evidence: 10,
  'multi-omics': 5,
  'digital-twin': 5,
};

export function getModuleWeight(moduleId: string): number {
  return MODULE_PRIORITY_WEIGHT[moduleId] ?? 5;
}

export const CONTRAINDICATED_KEYWORD = 'contraindicated';
export const AVOID_KEYWORD = 'avoid';

export function isCriticalAction(action: string): boolean {
  const lower = action.toLowerCase();
  return lower.includes(CONTRAINDICATED_KEYWORD) || lower.includes('life-threatening') || lower.includes('fatal');
}
