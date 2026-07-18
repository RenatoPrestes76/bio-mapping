import { Injectable } from '@nestjs/common';
import { HealthInsight, HealthPrediction, Recommendation, RecommendationStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import {
  ClinicalContext,
  DecisionDomain,
  DecisionProvider,
  InsightSignal,
  PredictionOutput,
  RecommendationCandidate,
} from '../../gaia/contracts/index.js';
import { ExplainabilityBuilder, ExplainabilityEngine } from '../../gaia/explainability/index.js';
import { InsightEngineService } from '../services/insight-engine.service.js';
import { RecommendationService } from '../services/recommendation.service.js';
import { PredictionsService } from '../services/predictions.service.js';

const PROVIDER_NAME = 'aegis-wellness';
const PROVIDER_VERSION = '1.0.0';
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Generaliza o `aegis` para o contrato DecisionProvider (Sprint 14.1,
 * Diretriz 2 e 4). Delega 100% para InsightEngineService/RecommendationService/
 * PredictionsService, exatamente como eles já funcionam — este adapter só
 * traduz a entrada/saída para os contratos genéricos do gaia. Nenhuma lógica
 * de negócio nova; os mesmos efeitos colaterais (linhas criadas em
 * HealthInsight/Recommendation/HealthPrediction) acontecem, na mesma ordem.
 *
 * Sprint 14.2: todo objeto Explainability é montado via ExplainabilityBuilder
 * — nenhum literal `{ ... }` de explicabilidade é escrito à mão aqui.
 */
@Injectable()
export class AegisWellnessProvider implements DecisionProvider {
  readonly name = PROVIDER_NAME;
  readonly domain: DecisionDomain = 'WELLNESS';
  readonly version = PROVIDER_VERSION;

  constructor(
    private readonly prisma: PrismaService,
    private readonly insightEngine: InsightEngineService,
    private readonly recommendationService: RecommendationService,
    private readonly predictionsService: PredictionsService,
    private readonly explainabilityEngine: ExplainabilityEngine,
  ) {}

  supports(): boolean {
    return true;
  }

  async generateInsights(context: ClinicalContext): Promise<InsightSignal[]> {
    await this.insightEngine.generateInsights(context.patientId);
    const recent = await this.fetchRecentInsights(context.patientId);
    return recent.map((insight) => this.toInsightSignal(insight, context));
  }

  async generateRecommendations(
    context: ClinicalContext,
    _insights: InsightSignal[],
  ): Promise<RecommendationCandidate[]> {
    const recent = await this.fetchRecentInsights(context.patientId);

    if (recent.length > 0) {
      const candidates = recent.map((insight) => ({
        category: insight.category,
        priority: insight.priority,
        insightType: insight.insightType,
        title: insight.title,
        message: insight.message,
        metrics: insight.metrics as string[],
        algorithm: insight.algorithm,
        dataWindow: insight.dataWindow,
      }));
      const insightIds = new Map(recent.map((insight) => [insight.insightType, insight.id]));
      await this.recommendationService.generateFromInsights(context.patientId, candidates, insightIds);
    }

    const pending = await this.recommendationService.getRecommendations(
      context.patientId,
      RecommendationStatus.PENDING,
    );
    return pending.map((recommendation) => this.toRecommendationCandidate(recommendation, context));
  }

  async generatePredictions(context: ClinicalContext): Promise<PredictionOutput[]> {
    const saved = await this.predictionsService.computePredictions(context.patientId);
    return saved.map((prediction) => this.toPredictionOutput(prediction, context));
  }

  private toInsightSignal(insight: HealthInsight, context: ClinicalContext): InsightSignal {
    const explainability = new ExplainabilityBuilder(this.explainabilityEngine, PROVIDER_NAME, context)
      .withReasoning(insight.message)
      .withEvidence([
        {
          source: 'aegis.dailyMetrics',
          field: 'dataWindow',
          value: insight.dataWindow,
          recordedAt: insight.generatedAt,
        },
      ])
      .withConfidenceScore(null)
      .withMetadata('algorithm', insight.algorithm)
      .withMetadata('insightType', insight.insightType)
      .build();

    return {
      insightId: insight.id,
      provider: PROVIDER_NAME,
      domain: 'WELLNESS',
      category: insight.category,
      priority: insight.priority,
      title: insight.title,
      message: insight.message,
      explainability,
    };
  }

  private toRecommendationCandidate(
    recommendation: Recommendation,
    context: ClinicalContext,
  ): RecommendationCandidate {
    const metrics = Array.isArray(recommendation.metrics) ? (recommendation.metrics as string[]) : [];
    const explainability = new ExplainabilityBuilder(this.explainabilityEngine, PROVIDER_NAME, context)
      .withReasoning(recommendation.rationale)
      .withEvidence(metrics.map((field) => ({ source: 'aegis', field, value: null })))
      .withConfidenceScore(null)
      .build();

    return {
      recommendationId: recommendation.id,
      provider: PROVIDER_NAME,
      priority: recommendation.priority,
      category: 'WELLNESS',
      title: recommendation.title,
      description: recommendation.description,
      rationale: recommendation.rationale,
      actions: [recommendation.action],
      explainability,
    };
  }

  private toPredictionOutput(prediction: HealthPrediction, context: ClinicalContext): PredictionOutput {
    const explainability = new ExplainabilityBuilder(this.explainabilityEngine, PROVIDER_NAME, context)
      .withReasoning(prediction.explanation)
      .withConfidenceScore(prediction.confidence)
      .withMetadata('algorithm', prediction.algorithm)
      .withMetadata('trend', prediction.trend)
      .withMetadata('riskLevel', prediction.riskLevel)
      .build();

    return {
      predictionType: prediction.metric,
      currentValue: prediction.currentValue ?? null,
      predictedValue: prediction.predictedValue,
      predictionDate: prediction.generatedAt,
      modelVersion: prediction.algorithm,
      explainability,
    };
  }

  private fetchRecentInsights(patientId: string): Promise<HealthInsight[]> {
    return this.prisma.healthInsight.findMany({
      where: { patientId, generatedAt: { gte: new Date(Date.now() - RECENT_WINDOW_MS) } },
    });
  }
}
