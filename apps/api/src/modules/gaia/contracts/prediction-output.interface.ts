import { Explainability } from './explainability.interface';

/**
 * Generalized prediction shape (Sprint 14.1, Diretriz 6) — a full explainable
 * object, not a bare number, so real predictive models can plug in later
 * without reshaping this contract. Confidence lives exclusively in
 * `explainability.confidence` since Sprint 14.2 — no duplicate flat field.
 */
export interface PredictionOutput {
  predictionType: string;
  currentValue: number | null;
  predictedValue: number;
  predictionDate: Date;
  modelVersion: string;
  explainability: Explainability;
}
