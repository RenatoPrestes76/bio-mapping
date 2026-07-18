import { randomUUID } from 'node:crypto';
import { ClinicalContext, DecisionTrace } from '../contracts';
import { ExplainabilityBuilder, ExplainabilityEngine } from '../explainability';
import { Prediction, PredictionModel, PredictionStateResult, PredictionWindow } from './prediction.types';

const PREDICTION_PROVIDER_NAME = 'prediction-engine';

const UNIT_LABELS: Record<PredictionWindow['unit'], string> = {
  DAYS: 'dias',
  MONTHS: 'meses',
  YEARS: 'anos',
};

/**
 * Única fábrica autorizada para Prediction (Sprint 14.5, P6) — espelha
 * ClinicalRiskBuilder da 14.3. Monta a Explainability via ExplainabilityBuilder
 * (nunca um literal `{ ... }` à mão) e embute a mesma referência de Confidence
 * no campo `confidence` da previsão.
 *
 * A limitação "tendência, não diagnóstico" (Diretriz 8) é fixada aqui, uma
 * vez, para toda previsão de qualquer modelo — não depende de cada model
 * lembrar de declarar isso.
 */
export class PredictionBuilder {
  constructor(
    private readonly explainabilityEngine: ExplainabilityEngine,
    private readonly model: PredictionModel,
    private readonly context: ClinicalContext,
  ) {}

  build(
    stateResult: PredictionStateResult,
    predictionWindow: PredictionWindow,
    recommendations: string[],
    confidenceScore: number,
    decisionTrace: DecisionTrace,
  ): Prediction {
    const explainability = new ExplainabilityBuilder(this.explainabilityEngine, PREDICTION_PROVIDER_NAME, this.context)
      .withReasoning(
        `${this.model.name}: tendência projetada para os próximos ${predictionWindow.duration} ${UNIT_LABELS[predictionWindow.unit]}`,
      )
      .withConfidenceScore(confidenceScore)
      .withMetadata('modelName', this.model.name)
      .withMetadata('modelVersion', this.model.version)
      .withMetadata('predictionType', this.model.predictionType)
      .withLimitation(
        'Previsão de tendência baseada em regras determinísticas — não é diagnóstico clínico nem conclusão sobre o estado de saúde do paciente',
      )
      .build();

    return {
      predictionId: randomUUID(),
      predictionType: this.model.predictionType,
      currentState: stateResult.current,
      predictedState: stateResult.predicted,
      predictionWindow,
      confidence: explainability.confidence,
      explainability,
      recommendations,
      decisionTrace,
      modelVersion: this.model.version,
      metadata: {
        predictionModelName: this.model.name,
        currentScore: stateResult.currentScore,
        predictedScore: stateResult.predictedScore,
      },
    };
  }
}
