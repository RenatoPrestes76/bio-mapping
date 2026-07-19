import { Evidence, EvidenceSource } from '../entities/evidence.entity.js';
import { EvidenceRating } from '../entities/evidence-rating.entity.js';
import { buildGradingResult, GradingResult } from './grade-system.js';

export interface RatedEvidence {
  evidence: Evidence;
  rating: EvidenceRating;
  grading: GradingResult;
  totalScore: number;
}

const SOURCE_WEIGHT: Record<EvidenceSource, number> = {
  [EvidenceSource.META_ANALYSIS]: 1.0,
  [EvidenceSource.SYSTEMATIC_REVIEW]: 0.95,
  [EvidenceSource.COCHRANE]: 0.95,
  [EvidenceSource.PUBMED]: 0.8,
  [EvidenceSource.NIH]: 0.75,
  [EvidenceSource.WHO]: 0.75,
  [EvidenceSource.CLINICAL_TRIALS]: 0.7,
  [EvidenceSource.JOURNAL]: 0.7,
  [EvidenceSource.GUIDELINE]: 0.65,
};

export function scoreEvidence(evidence: Evidence, rating: EvidenceRating): number {
  const sourceWeight = SOURCE_WEIGHT[evidence.source] ?? 0.5;
  const ratingScore = rating.overallScore();
  const recencyBonus = evidence.isRecent(5) ? 0.05 : 0;
  return Math.min(1, sourceWeight * ratingScore + recencyBonus);
}

export function buildRatedEvidence(evidence: Evidence, rating: EvidenceRating): RatedEvidence {
  const totalScore = scoreEvidence(evidence, rating);
  const grading = buildGradingResult(evidence.source, rating.grade, rating.strength, totalScore);
  return { evidence, rating, grading, totalScore };
}

export function rankByScore(items: RatedEvidence[]): RatedEvidence[] {
  return [...items].sort((a, b) => b.totalScore - a.totalScore);
}

export function deduplicateEvidence(items: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return items.filter((e) => {
    const key = e.doi ?? e.pmid ?? e.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
