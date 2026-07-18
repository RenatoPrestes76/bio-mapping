import { Explainability } from './explainability.interface';

/**
 * Generalized recommendation shape (Sprint 14.1, Diretriz 5). `recommendationId`
 * is a stable identifier assigned by the provider, meant to support future
 * deduplication, versioning, audit trail and clinician feedback — none of
 * which are implemented in this sprint, but the field exists so providers
 * don't need to change shape later. Since Sprint 14.2, carries a full
 * Explainability instead of loose evidence/confidence fields.
 */
export interface RecommendationCandidate {
  recommendationId: string;
  provider: string;
  priority: string;
  category: string;
  title: string;
  description: string;
  rationale: string;
  actions: string[];
  explainability: Explainability;
}
