import { Injectable } from '@nestjs/common';
import { ClinicalContext } from '../contracts';
import { ExplainabilityEngine } from '../explainability';
import { PredictionBuilder } from './prediction-builder';
import { Prediction, PredictionModel } from './prediction.types';

/**
 * Orquestrador de previsão (Sprint 14.5, Diretriz 1) — espelha
 * ClinicalRiskEngine. Só conhece o contrato `PredictionModel`: nunca
 * lifestyle, peso, sono ou qualquer outro conceito de domínio. Toda tradução
 * ClinicalContext → estado/previsão fica no Model; este Engine só orquestra
 * (computeStates → buildPredictionWindow → buildRecommendations → build) e
 * calcula a Confidence estrutural.
 */
@Injectable()
export class PredictionEngine {
  constructor(private readonly explainabilityEngine: ExplainabilityEngine) {}

  predict(model: PredictionModel, context: ClinicalContext): Prediction {
    const traceBuilder = this.explainabilityEngine.startTrace(context.patientId);

    const statesStart = new Date();
    const stateResult = model.computeStates(context);
    traceBuilder.recordStep('PROVIDER', statesStart, new Date(), 'SUCCESS', `${model.name}:computeStates`);

    const windowStart = new Date();
    const predictionWindow = model.buildPredictionWindow(context);
    traceBuilder.recordStep('PROVIDER', windowStart, new Date(), 'SUCCESS', `${model.name}:buildPredictionWindow`);

    const recsStart = new Date();
    const recommendations = model.buildRecommendations(stateResult);
    traceBuilder.recordStep('RECOMMENDATION', recsStart, new Date(), 'SUCCESS', `${model.name}:buildRecommendations`);

    const explainStart = new Date();
    const confidenceScore = this.computeConfidenceScore(model, context);
    const builder = new PredictionBuilder(this.explainabilityEngine, model, context);
    traceBuilder.recordStep('EXPLAINABILITY', explainStart, new Date(), 'SUCCESS', model.name);

    return builder.build(stateResult, predictionWindow, recommendations, confidenceScore, traceBuilder.build());
  }

  /**
   * Fração das capabilities que o modelo declara como necessárias e que de
   * fato tinham dado disponível no ClinicalContext — puramente estrutural,
   * mesmo cálculo do ClinicalRiskEngine.
   */
  private computeConfidenceScore(model: PredictionModel, context: ClinicalContext): number {
    if (model.requiredCapabilities.length === 0) return 1;

    const available = model.requiredCapabilities.filter((key) => {
      const section = context[key];
      return section.available && section.items.length > 0;
    }).length;

    return available / model.requiredCapabilities.length;
  }
}
