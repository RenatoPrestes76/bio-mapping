import { Injectable } from '@nestjs/common';
import { ScoringService } from '../scoring/services/scoring.service';
import { ClinicalContext } from '../../gaia/contracts';
import { ExplainabilityEngine } from '../../gaia/explainability';
import { ClinicalRiskBuilder } from './clinical-risk.builder';
import { ClinicalRiskAssessment, ClinicalRiskModel } from './clinical-risk.types';

/**
 * Orquestrador de risco clínico (Sprint 14.3, Diretriz 1). Só conhece
 * registro (via quem o chama), execução e agregação — NUNCA IMC, diabetes,
 * hipertensão ou qualquer outro conceito de doença. Toda tradução
 * ClinicalContext → ScoringInput fica no ClinicalRiskModel; este Engine só
 * despacha para o ScoringService (reaproveitado integralmente, nenhum
 * cálculo de score reimplementado aqui).
 */
@Injectable()
export class ClinicalRiskEngine {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly explainabilityEngine: ExplainabilityEngine,
  ) {}

  assess(model: ClinicalRiskModel, context: ClinicalContext): ClinicalRiskAssessment {
    const traceBuilder = this.explainabilityEngine.startTrace(context.patientId);

    const inputStart = new Date();
    const scoringInput = model.buildScoringInput(context);
    traceBuilder.recordStep('PROVIDER', inputStart, new Date(), 'SUCCESS', `${model.name}:buildScoringInput`);

    const scoringStart = new Date();
    const result = this.scoringService.calculate(model.scoringEngineName, scoringInput);
    traceBuilder.recordStep('PROVIDER', scoringStart, new Date(), 'SUCCESS', `scoringService:${model.scoringEngineName}`);

    const recsStart = new Date();
    const recommendations = model.buildRecommendations(result, context);
    traceBuilder.recordStep('RECOMMENDATION', recsStart, new Date(), 'SUCCESS', `${model.name}:buildRecommendations`);

    const explainStart = new Date();
    const confidenceScore = this.computeConfidenceScore(model, context);
    const builder = new ClinicalRiskBuilder(this.explainabilityEngine, model, context);
    traceBuilder.recordStep('EXPLAINABILITY', explainStart, new Date(), 'SUCCESS', model.name);

    return builder.build(result, recommendations, confidenceScore, traceBuilder.build());
  }

  /**
   * Fração das capabilities que o modelo declara como necessárias e que de
   * fato tinham dado disponível no ClinicalContext. Puramente estrutural —
   * mede completude de dado, não gravidade de risco (Sprint 14.3, Decisão 3).
   */
  private computeConfidenceScore(model: ClinicalRiskModel, context: ClinicalContext): number {
    if (model.requiredCapabilities.length === 0) return 1;

    const available = model.requiredCapabilities.filter((key) => {
      const section = context[key];
      return section.available && section.items.length > 0;
    }).length;

    return available / model.requiredCapabilities.length;
  }
}
