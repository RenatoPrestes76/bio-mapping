import { randomUUID } from 'node:crypto';
import type { ScoringResult } from '../scoring/engines/scoring-engine.interface';
import { ClinicalContext, DecisionTrace } from '../../gaia/contracts';
import { ExplainabilityBuilder, ExplainabilityEngine } from '../../gaia/explainability';
import { ClinicalRiskAssessment, ClinicalRiskModel } from './clinical-risk.types';

const RISK_PROVIDER_NAME = 'clinical-risk';

/**
 * Única fábrica autorizada para ClinicalRiskAssessment (Sprint 14.3, T6) —
 * espelha ExplainabilityBuilder da 14.2. Monta a Explainability via
 * ExplainabilityBuilder (nunca um literal `{ ... }` à mão) e embute a mesma
 * referência de Confidence no campo `confidence` do assessment.
 */
export class ClinicalRiskBuilder {
  constructor(
    private readonly explainabilityEngine: ExplainabilityEngine,
    private readonly model: ClinicalRiskModel,
    private readonly context: ClinicalContext,
  ) {}

  build(
    result: ScoringResult,
    recommendations: string[],
    confidenceScore: number,
    decisionTrace: DecisionTrace,
  ): ClinicalRiskAssessment {
    const explainability = new ExplainabilityBuilder(this.explainabilityEngine, RISK_PROVIDER_NAME, this.context)
      .withReasoning(`${this.model.name}: score ${result.percentage}% (${result.classification})`)
      .withConfidenceScore(confidenceScore)
      .withMetadata('recommendationType', 'GENERAL_WELLNESS')
      .withMetadata('modelName', this.model.name)
      .withMetadata('modelVersion', this.model.version)
      .withMetadata('scoringEngine', this.model.scoringEngineName)
      .withLimitation('Modelo piloto — regras simplificadas, não substitui avaliação clínica profissional')
      .build();

    return {
      riskId: randomUUID(),
      riskCategory: this.model.category,
      riskScore: result.percentage,
      riskLevel: result.riskLevel,
      confidence: explainability.confidence,
      explainability,
      decisionTrace,
      recommendations,
      modelVersion: this.model.version,
      metadata: { classification: result.classification, sectionScores: result.sectionScores },
    };
  }
}
