import { Module } from '@nestjs/common';
import { ExplainabilityEngine } from './explainability-engine';

/**
 * Módulo próprio pra ExplainabilityEngine (extraído do GaiaModule na Sprint
 * 14.4) — tanto GaiaModule quanto RecommendationEngineModule precisam dele,
 * e um sub-módulo compartilhado evita import circular entre os dois.
 */
@Module({
  providers: [ExplainabilityEngine],
  exports: [ExplainabilityEngine],
})
export class ExplainabilityModule {}
