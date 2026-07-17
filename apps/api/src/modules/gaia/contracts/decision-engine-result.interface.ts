import { InsightSignal } from './insight-signal.interface';
import { RecommendationCandidate } from './recommendation-candidate.interface';
import { PredictionOutput } from './prediction-output.interface';

export interface ProviderRunResult {
  provider: string;
  insights: InsightSignal[];
  recommendations: RecommendationCandidate[];
  predictions: PredictionOutput[];
}

export interface DecisionEngineResult {
  patientId: string;
  generatedAt: Date;
  providersRun: string[];
  results: ProviderRunResult[];
}
