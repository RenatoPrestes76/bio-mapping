import { DataPointRef } from './data-point-ref.interface';

/**
 * Generalized insight shape, symmetric to RecommendationCandidate — the
 * intermediate artifact a DecisionProvider produces before turning it into
 * recommendations/predictions.
 */
export interface InsightSignal {
  insightId: string;
  provider: string;
  domain: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  evidence: DataPointRef[];
  confidence: number | null;
}
