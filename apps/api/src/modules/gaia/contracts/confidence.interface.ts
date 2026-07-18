export type ConfidenceLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

/**
 * Confiança padronizada (Sprint 14.2, T5) — nunca um número solto. `level` é
 * derivado de `score` por faixas fixas (banding estrutural, não julgamento
 * clínico). `completeness`/`dataQuality` descrevem o quanto do ClinicalContext
 * estava disponível, não o que os dados significam.
 */
export interface Confidence {
  score: number;
  level: ConfidenceLevel;
  factors: string[];
  missingInformation: string[];
  dataQuality: number | null;
  completeness: number | null;
}
