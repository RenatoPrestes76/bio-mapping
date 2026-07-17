import { Module } from '@nestjs/common';
import { PulseController } from './controllers/pulse.controller.js';
import { DailyMetricsService } from './services/daily-metrics.service.js';
import { PulseHealthScoreService } from './services/health-score.service.js';
import { PulseRecoveryService } from './services/recovery.service.js';
import { TrainingLoadService } from './services/training-load.service.js';
import { TrendsService } from './services/trends.service.js';
import { PulseAlertsService } from './services/alerts.service.js';
import { TimelineService } from './services/timeline.service.js';
import { DashboardService } from './services/dashboard.service.js';
import { PulseSchedulerService } from './schedulers/pulse-scheduler.service.js';
import { DailyMetricsRepository } from './repositories/daily-metrics.repository.js';
import { DailyHealthScoreRepository } from './repositories/daily-health-score.repository.js';
import { TrainingLoadRepository } from './repositories/training-load.repository.js';

@Module({
  controllers: [PulseController],
  providers: [
    // Services
    DailyMetricsService,
    PulseHealthScoreService,
    PulseRecoveryService,
    TrainingLoadService,
    TrendsService,
    PulseAlertsService,
    TimelineService,
    DashboardService,
    // Scheduler
    PulseSchedulerService,
    // Repositories
    DailyMetricsRepository,
    DailyHealthScoreRepository,
    TrainingLoadRepository,
  ],
  exports: [
    DailyMetricsService,
    PulseHealthScoreService,
    PulseRecoveryService,
    TrainingLoadService,
    TrendsService,
  ],
})
export class PulseModule {}
