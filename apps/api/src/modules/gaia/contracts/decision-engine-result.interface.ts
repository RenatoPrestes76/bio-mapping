import { InsightSignal } from './insight-signal.interface';
import { RecommendationCandidate } from './recommendation-candidate.interface';
import { PredictionOutput } from './prediction-output.interface';
import { Provenance } from './provenance.interface';
import { DecisionTrace } from './decision-trace.interface';
import { RecommendationSet } from '../recommendations/recommendation.types';

export interface ProviderRunResult {
  provider: string;
  provenance: Provenance;
  insights: InsightSignal[];
  recommendations: RecommendationCandidate[];
  predictions: PredictionOutput[];
}

/**
 * `recommendationSet` (Sprint 14.4, Diretriz 6) é uma extensão aditiva —
 * `results[i].recommendations` continua existindo do jeito que já existia
 * na 14.1/14.2, sem mudar de tipo. O RecommendationSet é o resultado
 * consolidado de TODOS os providers, calculado uma vez no fim do pipeline.
 */
export interface DecisionEngineResult {
  patientId: string;
  generatedAt: Date;
  providersRun: string[];
  results: ProviderRunResult[];
  trace: DecisionTrace;
  recommendationSet: RecommendationSet;
}
