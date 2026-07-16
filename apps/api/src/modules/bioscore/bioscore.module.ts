import { Module } from '@nestjs/common';
import { BioScoreController } from './controllers/bioscore.controller.js';
import { BioScoreService } from './services/bioscore.service.js';
import { BodyMetricsService } from './services/body-metrics.service.js';
import { CardioMetricsService } from './services/cardio-metrics.service.js';
import { SleepMetricsService } from './services/sleep-metrics.service.js';
import { SportMetricsService } from './services/sport-metrics.service.js';
import { RecoveryService } from './services/recovery.service.js';
import { HealthScoreService } from './services/health-score.service.js';
import { AlertsService } from './services/alerts.service.js';
import { TrendsService } from './services/trends.service.js';
import { DashboardService } from './services/dashboard.service.js';
import { BioScoreRepository } from './repositories/bioscore.repository.js';
import { SleepMetricsRepository } from './repositories/sleep-metrics.repository.js';
import { SportMetricsRepository } from './repositories/sport-metrics.repository.js';
import { RecoveryRepository } from './repositories/recovery.repository.js';
import { TrendAnalysisRepository } from './repositories/trend-analysis.repository.js';
import { AlertsRepository } from './repositories/alerts.repository.js';

@Module({
  controllers: [BioScoreController],
  providers: [
    // Services
    BioScoreService,
    BodyMetricsService,
    CardioMetricsService,
    SleepMetricsService,
    SportMetricsService,
    RecoveryService,
    HealthScoreService,
    AlertsService,
    TrendsService,
    DashboardService,
    // Repositories
    BioScoreRepository,
    SleepMetricsRepository,
    SportMetricsRepository,
    RecoveryRepository,
    TrendAnalysisRepository,
    AlertsRepository,
  ],
  exports: [BioScoreService, AlertsService, TrendsService],
})
export class BioScoreModule {}
