import { DataPointRef } from './data-point-ref.interface';

/**
 * Shared explainability shape for insights, recommendations and predictions.
 * `guidelineReferences` stays empty until Sprint 14.7 (Scientific Evidence)
 * populates it — the field exists now so nothing downstream breaks later.
 */
export interface Explainability {
  confidence: number | null;
  reasoning: string;
  evidence: DataPointRef[];
  sourceProvider: string;
  generatedAt: Date;
  guidelineReferences: string[];
  limitations: string[];
  warnings: string[];
}
