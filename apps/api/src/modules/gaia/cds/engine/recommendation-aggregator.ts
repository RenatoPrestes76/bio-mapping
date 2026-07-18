import type { CdsPriority, RuleMatchResult } from './rule-engine.js';
import { getPriorityBand } from './priority-calculator.js';
import { evidenceQualityScore } from './confidence-calculator.js';

const PRIORITY_RANK: Record<CdsPriority, number> = {
  LOW: 0, MODERATE: 1, HIGH: 2, URGENT: 3, CRITICAL: 4,
};

const EVIDENCE_RANK: Record<string, number> = {
  A: 4, B: 3, C: 2, D: 1, EXPERT_OPINION: 0,
};

export interface AggregatorInput {
  matchedRules: RuleMatchResult[];
  predictionRecommendations?: string[];
  riskRecommendations?: string[];
  resolvedPriority: CdsPriority;
}

export function resolveHighestPriority(priorities: CdsPriority[]): CdsPriority {
  if (priorities.length === 0) return 'LOW';
  return priorities.reduce<CdsPriority>(
    (max, p) => PRIORITY_RANK[p] > PRIORITY_RANK[max] ? p : max,
    'LOW',
  );
}

export function aggregateRecommendation(input: AggregatorInput): string {
  if (input.matchedRules.length === 0) {
    return getPriorityBand(input.resolvedPriority).defaultRecommendation;
  }

  // Use the recommendation from the highest-priority matched rule
  const topRule = input.matchedRules.reduce(
    (top, r) => PRIORITY_RANK[r.priority] > PRIORITY_RANK[top.priority] ? r : top,
    input.matchedRules[0],
  );

  return topRule.recommendation;
}

export function buildReasons(input: AggregatorInput): string[] {
  const reasons: string[] = input.matchedRules.map((r) => r.ruleName);
  if (input.predictionRecommendations) reasons.push(...input.predictionRecommendations);
  if (input.riskRecommendations) reasons.push(...input.riskRecommendations);
  return [...new Set(reasons)];
}

export function determineEvidenceLevel(matchedRules: RuleMatchResult[]): string {
  if (matchedRules.length === 0) return 'D';
  return matchedRules.reduce(
    (best, r) => (EVIDENCE_RANK[r.evidenceLevel] ?? 0) > (EVIDENCE_RANK[best] ?? 0) ? r.evidenceLevel : best,
    'D',
  );
}

export function buildWeightsMap(matchedRules: RuleMatchResult[]): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const rule of matchedRules) {
    const priorityWeight = PRIORITY_RANK[rule.priority] + 1;
    const evidenceWeight = evidenceQualityScore(rule.evidenceLevel);
    weights[rule.ruleName] = Math.round(priorityWeight * evidenceWeight * 100) / 100;
  }
  return weights;
}
