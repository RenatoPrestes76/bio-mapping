import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ClinicalContext,
  DecisionDomain,
  DecisionProvider,
  InsightSignal,
  PredictionOutput,
  RecommendationCandidate,
} from '../../gaia/contracts';
import { ClinicalRiskEngine } from './clinical-risk-engine';
import { ClinicalRiskRegistry } from './clinical-risk.registry';
import { ClinicalRiskAssessment } from './clinical-risk.types';

const PROVIDER_NAME = 'clinical-risk';
const PROVIDER_VERSION = '1.0.0';

function priorityFromRiskLevel(riskLevel: ClinicalRiskAssessment['riskLevel']): string {
  switch (riskLevel) {
    case 'CRITICAL':
      return 'ALTA_PRIORIDADE';
    case 'HIGH':
      return 'IMPORTANTE';
    case 'MODERATE':
      return 'ATENCAO';
    default:
      return 'INFORMATIVO';
  }
}

/**
 * Integra o Clinical Risk Engine ao GAIA como um Provider a mais (Sprint
 * 14.3, T8) — nunca lógica dentro do DecisionEngineService. `predictions`
 * fica vazio propositalmente nesta sprint (Sprint 14.5).
 */
@Injectable()
export class ClinicalRiskProvider implements DecisionProvider {
  readonly name = PROVIDER_NAME;
  readonly domain: DecisionDomain = 'CLINICAL';
  readonly version = PROVIDER_VERSION;

  constructor(
    private readonly registry: ClinicalRiskRegistry,
    private readonly engine: ClinicalRiskEngine,
  ) {}

  supports(): boolean {
    return true;
  }

  async generateInsights(context: ClinicalContext): Promise<InsightSignal[]> {
    return this.assessAll(context).map((assessment) => this.toInsightSignal(assessment));
  }

  async generateRecommendations(
    context: ClinicalContext,
    _insights: InsightSignal[],
  ): Promise<RecommendationCandidate[]> {
    return this.assessAll(context).map((assessment) => this.toRecommendationCandidate(assessment));
  }

  async generatePredictions(): Promise<PredictionOutput[]> {
    return [];
  }

  private assessAll(context: ClinicalContext): ClinicalRiskAssessment[] {
    return this.registry.listEnabled().map((model) => this.engine.assess(model, context));
  }

  private toInsightSignal(assessment: ClinicalRiskAssessment): InsightSignal {
    return {
      insightId: assessment.riskId,
      provider: PROVIDER_NAME,
      domain: 'CLINICAL',
      category: assessment.riskCategory,
      priority: priorityFromRiskLevel(assessment.riskLevel),
      title: `Risco ${assessment.riskCategory}: ${assessment.riskLevel}`,
      message: assessment.explainability.reasoning,
      explainability: assessment.explainability,
    };
  }

  private toRecommendationCandidate(assessment: ClinicalRiskAssessment): RecommendationCandidate {
    return {
      recommendationId: randomUUID(),
      provider: PROVIDER_NAME,
      priority: priorityFromRiskLevel(assessment.riskLevel),
      category: assessment.riskCategory,
      title: `Recomendações — ${assessment.riskCategory}`,
      description: `Baseado no risco ${assessment.riskLevel} (${assessment.riskScore}%)`,
      rationale: assessment.explainability.reasoning,
      actions: assessment.recommendations,
      explainability: assessment.explainability,
    };
  }
}
