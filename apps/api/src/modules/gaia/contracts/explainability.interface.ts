import { DataPointRef } from './data-point-ref.interface';
import { Confidence } from './confidence.interface';

/**
 * Shared explainability shape for insights, recommendations and predictions
 * (Sprint 14.1, extended in 14.2 T2). The only authorized way to construct
 * one of these is ExplainabilityBuilder (modules/gaia/explainability) — no
 * provider should assemble this object literal by hand.
 *
 * `guidelineReferences` stays empty until Sprint 14.7 (Scientific Evidence)
 * populates it — the field exists now so nothing downstream breaks later.
 */
export interface Explainability {
  decisionId: string;
  confidence: Confidence;
  reasoning: string;
  evidence: DataPointRef[];
  sourceProvider: string;
  generatedAt: Date;
  guidelineReferences: string[];
  limitations: string[];
  warnings: string[];
  metadata: Record<string, unknown>;
}
