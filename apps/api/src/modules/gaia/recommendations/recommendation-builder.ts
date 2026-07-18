import { ClinicalContext } from '../contracts';
import { ExplainabilityBuilder, ExplainabilityEngine } from '../explainability';
import { MergedRecommendation, RecommendationSet, RecommendationSetStatistics } from './recommendation.types';

const ENGINE_PROVIDER_NAME = 'recommendation-engine';

/**
 * Única fábrica autorizada para RecommendationSet (Sprint 14.4, R8) — mesmo
 * padrão de ClinicalRiskBuilder/ExplainabilityBuilder. A consolidação é um
 * processo determinístico sobre candidatos já prontos (não uma leitura de
 * dado clínico novo), então a Confidence é fixada em 1 com hints explícitos
 * — não deriva completude do ClinicalContext, que não é o que está sendo
 * avaliado aqui.
 */
export class RecommendationBuilder {
  constructor(
    private readonly explainabilityEngine: ExplainabilityEngine,
    private readonly context: ClinicalContext,
  ) {}

  build(
    recommendations: MergedRecommendation[],
    statistics: RecommendationSetStatistics,
    providerCount: number,
  ): RecommendationSet {
    const explainability = new ExplainabilityBuilder(this.explainabilityEngine, ENGINE_PROVIDER_NAME, this.context)
      .withReasoning(
        `${recommendations.length} recomendação(ões) consolidada(s) de ${statistics.candidatesReceived} candidata(s) ` +
          `(${statistics.duplicatesRemoved} duplicata(s) mesclada(s))`,
      )
      .withConfidenceScore(1, { factors: ['agregação determinística de candidatos'], missingInformation: [] })
      .withMetadata('candidatesReceived', statistics.candidatesReceived)
      .withMetadata('duplicatesRemoved', statistics.duplicatesRemoved)
      .build();

    return {
      recommendations,
      summary: `${recommendations.length} recomendação(ões) de ${providerCount} provider(s) — maior prioridade: ${statistics.highestPriority}`,
      statistics,
      explainability,
      metadata: {},
      generatedAt: new Date(),
      providerCount,
    };
  }
}
