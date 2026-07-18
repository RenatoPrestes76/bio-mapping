import { ClinicalContext, Confidence, DecisionTrace, Explainability } from '../contracts';

/**
 * Categoria metodológica da previsão (Sprint 14.5, Diretriz 4) — nunca texto
 * livre. Hoje só `TREND` é produzido; `FORECAST`/`TRAJECTORY`/`PROJECTION`
 * existem para modelos futuros que usem uma abordagem diferente de
 * persistência de tendência. União de literais (não `enum` do TypeScript),
 * mesmo estilo já usado por `ConfidenceLevel`/`ExecutionStatus`/`DecisionDomain`.
 */
export type PredictionType = 'TREND' | 'FORECAST' | 'TRAJECTORY' | 'PROJECTION';

export type PredictionWindowUnit = 'DAYS' | 'MONTHS' | 'YEARS';

/**
 * Janela temporal como objeto (Sprint 14.5, Diretriz 3) — `duration`/`unit`
 * descrevem o tamanho declarado (7 dias, 6 meses, 1 ano, ...), `start`/`end`
 * são a instância concreta dessa janela para uma previsão específica.
 */
export interface PredictionWindow {
  start: Date;
  end: Date;
  duration: number;
  unit: PredictionWindowUnit;
}

/**
 * Chaves das capabilities do ClinicalContext usadas para o cálculo estrutural
 * de Confidence (mesmo papel de `ClinicalContextCapabilityKey` em
 * clinical-risk.types.ts — duplicado de propósito, não importado de lá:
 * Prediction é um domínio independente, P3 "não herda ClinicalRisk").
 */
export type PredictionContextCapabilityKey =
  | 'vitals'
  | 'laboratory'
  | 'lifestyle'
  | 'nutrition'
  | 'medication'
  | 'conditions'
  | 'assessments'
  | 'wearables'
  | 'familyHistory'
  | 'genomics'
  | 'imaging'
  | 'fhirResources';

/**
 * Resultado de `PredictionModel.computeStates()` (Sprint 14.5, T3). `current`/
 * `predicted` são registros livres — só o Model dono sabe o que as chaves
 * significam (Diretriz 1: Engine nunca conhece "lifestyle", "peso", "sono").
 * `currentScore`/`predictedScore` são a única informação padronizada (banda
 * 0–10, mesma convenção do `MetabolicRiskModel`) que o Provider pode ler
 * genericamente para achatar em `PredictionOutput.currentValue`/`predictedValue`
 * sem precisar entender o resto do estado.
 */
export interface PredictionStateResult {
  current: Record<string, unknown>;
  predicted: Record<string, unknown>;
  currentScore: number;
  predictedScore: number;
}

/**
 * Previsão de TENDÊNCIA, nunca conclusão clínica (Sprint 14.5, Diretriz 8).
 * Domínio independente (P3) — não herda Assessment nem ClinicalRisk.
 * `confidence` é sempre a mesma referência de `explainability.confidence`
 * (Diretriz 5 — nunca duas fontes de confiança), mesmo invariante do
 * `ClinicalRiskAssessment`.
 */
export interface Prediction {
  predictionId: string;
  predictionType: PredictionType;
  currentState: Record<string, unknown>;
  predictedState: Record<string, unknown>;
  predictionWindow: PredictionWindow;
  confidence: Confidence;
  explainability: Explainability;
  recommendations: string[];
  decisionTrace: DecisionTrace;
  modelVersion: string;
  metadata: Record<string, unknown>;
}

/**
 * Contrato que cada modelo de previsão implementa (Sprint 14.5, Diretriz 1/2)
 * — espelha `ClinicalRiskModel`. O `PredictionEngine` só conhece esta
 * interface, nunca lifestyle/peso/sono/diabetes ou qualquer outro conceito de
 * domínio. `name` é a chave única do Registry (vários modelos podem
 * compartilhar o mesmo `predictionType`, ex: futuros `weight-trend` e
 * `sleep-trend` seriam ambos `TREND`).
 */
export interface PredictionModel {
  readonly name: string;
  readonly predictionType: PredictionType;
  readonly version: string;
  readonly requiredCapabilities: PredictionContextCapabilityKey[];

  computeStates(context: ClinicalContext): PredictionStateResult;

  buildPredictionWindow(context: ClinicalContext): PredictionWindow;

  buildRecommendations(result: PredictionStateResult): string[];
}
