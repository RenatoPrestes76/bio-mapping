import { ClinicalContext } from './clinical-context.interface';
import { InsightSignal } from './insight-signal.interface';
import { RecommendationCandidate } from './recommendation-candidate.interface';
import { PredictionOutput } from './prediction-output.interface';

export type DecisionDomain = 'WELLNESS' | 'CLINICAL';

/**
 * The only thing the Decision Engine knows about a provider (Sprint 14.1,
 * Diretriz 2). AegisWellnessProvider is the first implementation; future
 * providers (clinical, laboratory, fhir, genomics, ...) implement the same
 * contract and register themselves the same way — the engine never depends
 * on any provider's internals.
 */
export interface DecisionProvider {
  readonly name: string;
  readonly domain: DecisionDomain;

  supports(context: ClinicalContext): boolean;

  generateInsights(context: ClinicalContext): Promise<InsightSignal[]>;

  generateRecommendations(
    context: ClinicalContext,
    insights: InsightSignal[],
  ): Promise<RecommendationCandidate[]>;

  generatePredictions(context: ClinicalContext): Promise<PredictionOutput[]>;
}
