import type { EvidenceContribution } from '../entities/clinical-decision.entity.js';

export interface ConfidenceInput {
  modulesQueried: string[];
  modulesWithData: string[];
  evidenceContributions: EvidenceContribution[];
  recommendationCount: number;
  conflictCount: number;
  hasGenomicData: boolean;
  hasPgxData: boolean;
  hasClinicalReasoningData: boolean;
  hasPersonalizedMedicineData: boolean;
  hasEvidenceData: boolean;
}

export interface ConfidenceBreakdown {
  dataCompleteness: number;
  evidenceQuality: number;
  moduleAgreement: number;
  clinicalConsistency: number;
  total: number;
}

const EVIDENCE_LEVEL_SCORE: Record<string, number> = { A: 20, B: 15, C: 10, D: 5 };

export class ConfidenceScoreEngine {
  compute(input: ConfidenceInput): ConfidenceBreakdown {
    const dataCompleteness = this.computeDataCompleteness(input);
    const evidenceQuality = this.computeEvidenceQuality(input.evidenceContributions);
    const moduleAgreement = this.computeModuleAgreement(input);
    const clinicalConsistency = this.computeClinicalConsistency(input);

    const total = Math.min(
      100,
      Math.round(dataCompleteness + evidenceQuality + moduleAgreement + clinicalConsistency),
    );

    return { dataCompleteness, evidenceQuality, moduleAgreement, clinicalConsistency, total };
  }

  private computeDataCompleteness(input: ConfidenceInput): number {
    // Max 35 points based on which key data sources are available
    let score = 0;
    if (input.hasPgxData) score += 10;
    if (input.hasGenomicData) score += 10;
    if (input.hasClinicalReasoningData) score += 8;
    if (input.hasPersonalizedMedicineData) score += 5;
    if (input.hasEvidenceData) score += 2;

    // Bonus for overall module coverage
    const coverage = input.modulesWithData.length / Math.max(input.modulesQueried.length, 1);
    score += Math.round(coverage * 5);

    return Math.min(35, score);
  }

  private computeEvidenceQuality(contributions: EvidenceContribution[]): number {
    // Max 30 points based on evidence quality
    if (contributions.length === 0) return 5;

    const weightedScore = contributions.reduce((sum, c) => {
      const baseWeight = EVIDENCE_LEVEL_SCORE['A'] ?? 5;
      return sum + c.confidenceWeight * baseWeight * c.dataCompleteness;
    }, 0);

    return Math.min(30, Math.round(weightedScore / Math.max(contributions.length, 1)));
  }

  private computeModuleAgreement(input: ConfidenceInput): number {
    // Max 20 points — penalise conflicts
    const baseScore = 20;
    const conflictPenalty = input.conflictCount * 4;
    return Math.max(0, baseScore - conflictPenalty);
  }

  private computeClinicalConsistency(input: ConfidenceInput): number {
    // Max 15 points based on recommendation coherence
    if (input.recommendationCount === 0) return 5;
    if (input.recommendationCount <= 3) return 15;
    if (input.recommendationCount <= 6) return 12;
    return 8;
  }

  describeConfidence(score: number): string {
    if (score >= 85) return 'Very High — strong multi-source evidence convergence';
    if (score >= 70) return 'High — good evidence base with minor uncertainty';
    if (score >= 55) return 'Moderate — reasonable evidence, some data gaps';
    if (score >= 40) return 'Low — limited data available, interpret cautiously';
    return 'Very Low — insufficient data, manual review required';
  }
}
