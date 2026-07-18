import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ClinicalContext,
  DecisionDomain,
  DecisionProvider,
  InsightSignal,
  PredictionOutput,
  RecommendationCandidate,
} from '../contracts';
import { PredictionEngine } from './prediction-engine';
import { PredictionRegistry } from './prediction-registry';
import { Prediction, PredictionWindowUnit } from './prediction.types';

const PROVIDER_NAME = 'prediction-engine';
const PROVIDER_VERSION = '1.0.0';

const UNIT_LABELS: Record<PredictionWindowUnit, string> = {
  DAYS: 'dias',
  MONTHS: 'meses',
  YEARS: 'anos',
};

/** Score agregado (0-10, banda do model) → prioridade de wellness. */
function priorityFromScore(score: number): string {
  if (score < 3) return 'IMPORTANTE';
  if (score < 6) return 'ATENCAO';
  return 'INFORMATIVO';
}

function modelName(prediction: Prediction): string {
  return prediction.metadata.predictionModelName as string;
}

function predictedScore(prediction: Prediction): number {
  return prediction.metadata.predictedScore as number;
}

function currentScore(prediction: Prediction): number | null {
  const score = prediction.metadata.currentScore;
  return typeof score === 'number' ? score : null;
}

/**
 * Integra o Prediction Engine ao GAIA como um Provider a mais (Sprint 14.5,
 * P9) — nunca lógica dentro do DecisionEngineService, mesmo padrão do
 * ClinicalRiskProvider. Produz apenas RecommendationCandidate — a consolidação
 * continua sendo responsabilidade exclusiva do Recommendation Engine (P8).
 */
@Injectable()
export class PredictionProvider implements DecisionProvider {
  readonly name = PROVIDER_NAME;
  readonly domain: DecisionDomain = 'WELLNESS';
  readonly version = PROVIDER_VERSION;

  constructor(
    private readonly registry: PredictionRegistry,
    private readonly engine: PredictionEngine,
  ) {}

  supports(): boolean {
    return true;
  }

  async generateInsights(context: ClinicalContext): Promise<InsightSignal[]> {
    return this.predictAll(context).map((prediction) => this.toInsightSignal(prediction));
  }

  async generateRecommendations(
    context: ClinicalContext,
    _insights: InsightSignal[],
  ): Promise<RecommendationCandidate[]> {
    return this.predictAll(context).map((prediction) => this.toRecommendationCandidate(prediction));
  }

  async generatePredictions(context: ClinicalContext): Promise<PredictionOutput[]> {
    return this.predictAll(context).map((prediction) => this.toPredictionOutput(prediction));
  }

  private predictAll(context: ClinicalContext): Prediction[] {
    return this.registry.listEnabled().map((model) => this.engine.predict(model, context));
  }

  private toInsightSignal(prediction: Prediction): InsightSignal {
    return {
      insightId: prediction.predictionId,
      provider: PROVIDER_NAME,
      domain: 'WELLNESS',
      category: modelName(prediction),
      priority: priorityFromScore(predictedScore(prediction)),
      title: `Previsão (${prediction.predictionType}) — ${modelName(prediction)}`,
      message: prediction.explainability.reasoning,
      explainability: prediction.explainability,
    };
  }

  private toRecommendationCandidate(prediction: Prediction): RecommendationCandidate {
    return {
      recommendationId: randomUUID(),
      provider: PROVIDER_NAME,
      priority: priorityFromScore(predictedScore(prediction)),
      category: modelName(prediction),
      title: `Tendência prevista — ${modelName(prediction)}`,
      description: `Previsão para os próximos ${prediction.predictionWindow.duration} ${UNIT_LABELS[prediction.predictionWindow.unit]}`,
      rationale: prediction.explainability.reasoning,
      actions: prediction.recommendations,
      explainability: prediction.explainability,
    };
  }

  private toPredictionOutput(prediction: Prediction): PredictionOutput {
    return {
      predictionType: prediction.predictionType,
      currentValue: currentScore(prediction),
      predictedValue: predictedScore(prediction),
      predictionDate: prediction.predictionWindow.end,
      modelVersion: prediction.modelVersion,
      explainability: prediction.explainability,
    };
  }
}
