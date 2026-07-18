import { Injectable } from '@nestjs/common';
import { ClinicalContext, RecommendationCandidate } from '../contracts';
import { ExplainabilityEngine } from '../explainability';
import { RecommendationBuilder } from './recommendation-builder';
import { RecommendationDeduplicator } from './recommendation-deduplicator';
import { RecommendationPrioritizer } from './recommendation-prioritizer';
import { RecommendationSet, RecommendationSetStatistics } from './recommendation.types';

/**
 * Camada de orquestração de recomendações (Sprint 14.4, R4) — nunca produz
 * recomendação nenhuma, só consolida o que os Providers já sugeriram.
 * collect (entrada) → dedup → priorização → RecommendationSet.
 */
@Injectable()
export class RecommendationEngine {
  constructor(
    private readonly deduplicator: RecommendationDeduplicator,
    private readonly prioritizer: RecommendationPrioritizer,
    private readonly explainabilityEngine: ExplainabilityEngine,
  ) {}

  consolidate(candidates: RecommendationCandidate[], context: ClinicalContext): RecommendationSet {
    const deduped = this.deduplicator.deduplicate(candidates);
    const sorted = this.prioritizer.sort(deduped);

    const providerCount = new Set(candidates.map((candidate) => candidate.provider)).size;
    const statistics: RecommendationSetStatistics = {
      candidatesReceived: candidates.length,
      duplicatesRemoved: candidates.length - deduped.length,
      highestPriority: this.prioritizer.highestPriority(candidates),
      priorityBreakdown: this.prioritizer.breakdown(candidates),
    };

    const builder = new RecommendationBuilder(this.explainabilityEngine, context);
    return builder.build(sorted, statistics, providerCount);
  }
}
