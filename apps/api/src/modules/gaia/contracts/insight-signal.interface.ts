import { Explainability } from './explainability.interface';

/**
 * Generalized insight shape, symmetric to RecommendationCandidate — the
 * intermediate artifact a DecisionProvider produces before turning it into
 * recommendations/predictions. Since Sprint 14.2, carries a full
 * Explainability instead of loose evidence/confidence fields.
 */
export interface InsightSignal {
  insightId: string;
  provider: string;
  domain: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  explainability: Explainability;
}
