import { Module } from '@nestjs/common';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { RecommendationEngine } from './recommendation-engine';
import { RecommendationRegistry } from './recommendation-registry';
import { RecommendationDeduplicator } from './recommendation-deduplicator';
import { RecommendationPrioritizer } from './recommendation-prioritizer';

@Module({
  imports: [ExplainabilityModule],
  providers: [RecommendationRegistry, RecommendationDeduplicator, RecommendationPrioritizer, RecommendationEngine],
  exports: [RecommendationEngine, RecommendationRegistry],
})
export class RecommendationEngineModule {}
