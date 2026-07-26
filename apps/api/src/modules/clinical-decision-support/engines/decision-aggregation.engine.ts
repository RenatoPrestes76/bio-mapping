import type { ClinicalRecommendationItem, EvidenceContribution } from '../entities/clinical-decision.entity.js';
import type { DecisionContext } from '../entities/decision-context.entity.js';

export interface ModuleResult {
  module: string;
  recommendations: ClinicalRecommendationItem[];
  evidenceContributions: EvidenceContribution[];
  dataCompleteness: number;
}

export interface AggregationOutput {
  recommendations: ClinicalRecommendationItem[];
  evidence: EvidenceContribution[];
  modulesWithData: string[];
  totalDataCompleteness: number;
}

export class DecisionAggregationEngine {
  aggregate(results: ModuleResult[], _context: DecisionContext): AggregationOutput {
    const allRecommendations: ClinicalRecommendationItem[] = [];
    const allEvidence: EvidenceContribution[] = [];
    const modulesWithData: string[] = [];

    for (const result of results) {
      if (result.recommendations.length > 0 || result.evidenceContributions.length > 0) {
        modulesWithData.push(result.module);
        allRecommendations.push(...result.recommendations);
        allEvidence.push(...result.evidenceContributions);
      }
    }

    const totalDataCompleteness =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.dataCompleteness, 0) / results.length
        : 0;

    return {
      recommendations: this.deduplicateRecommendations(allRecommendations),
      evidence: allEvidence,
      modulesWithData,
      totalDataCompleteness: Math.round(totalDataCompleteness),
    };
  }

  buildModuleResult(
    module: string,
    recommendations: ClinicalRecommendationItem[],
    evidenceContributions: EvidenceContribution[] = [],
    dataCompleteness = 100,
  ): ModuleResult {
    return { module, recommendations, evidenceContributions, dataCompleteness };
  }

  mergeResults(a: AggregationOutput, b: AggregationOutput): AggregationOutput {
    const merged = this.aggregate(
      [
        { module: 'merged-a', recommendations: a.recommendations, evidenceContributions: a.evidence, dataCompleteness: a.totalDataCompleteness },
        { module: 'merged-b', recommendations: b.recommendations, evidenceContributions: b.evidence, dataCompleteness: b.totalDataCompleteness },
      ],
      {} as any,
    );
    return {
      ...merged,
      modulesWithData: [...new Set([...a.modulesWithData, ...b.modulesWithData])],
    };
  }

  private deduplicateRecommendations(recs: ClinicalRecommendationItem[]): ClinicalRecommendationItem[] {
    const seen = new Map<string, ClinicalRecommendationItem>();
    for (const rec of recs) {
      const key = rec.action.toLowerCase().trim();
      const existing = seen.get(key);
      if (!existing || rec.confidenceContribution > existing.confidenceContribution) {
        seen.set(key, rec);
      }
    }
    return [...seen.values()];
  }
}
