import { Module, OnModuleInit } from '@nestjs/common';
import { GaiaModule } from '../gaia/gaia.module.js';
import { DecisionEngineService } from '../gaia/decision-engine.service.js';
import { AegisController } from './controllers/aegis.controller.js';
import { InsightEngineService } from './services/insight-engine.service.js';
import { RecommendationService } from './services/recommendation.service.js';
import { GoalsService } from './services/goals.service.js';
import { PredictionsService } from './services/predictions.service.js';
import { AegisDashboardService } from './services/aegis-dashboard.service.js';
import { AegisSchedulerService } from './schedulers/aegis-scheduler.service.js';
import { HealthInsightRepository } from './repositories/health-insight.repository.js';
import { RecommendationRepository } from './repositories/recommendation.repository.js';
import { UserGoalRepository } from './repositories/user-goal.repository.js';
import { AegisWellnessProvider } from './providers/aegis-wellness.provider.js';

@Module({
  imports: [GaiaModule],
  controllers: [AegisController],
  providers: [
    // Services
    InsightEngineService,
    RecommendationService,
    GoalsService,
    PredictionsService,
    AegisDashboardService,
    // Scheduler
    AegisSchedulerService,
    // Repositories
    HealthInsightRepository,
    RecommendationRepository,
    UserGoalRepository,
    // Decision Engine provider (Sprint 14.1)
    AegisWellnessProvider,
  ],
  exports: [
    InsightEngineService,
    RecommendationService,
    GoalsService,
    PredictionsService,
  ],
})
export class AegisModule implements OnModuleInit {
  constructor(
    private readonly decisionEngine: DecisionEngineService,
    private readonly aegisWellnessProvider: AegisWellnessProvider,
  ) {}

  onModuleInit(): void {
    this.decisionEngine.registerProvider(this.aegisWellnessProvider);
  }
}
