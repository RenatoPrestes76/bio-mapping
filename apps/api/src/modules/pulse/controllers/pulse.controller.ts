import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator';
import { DashboardService } from '../services/dashboard.service.js';
import { PulseHealthScoreService } from '../services/health-score.service.js';
import { PulseRecoveryService } from '../services/recovery.service.js';
import { TrainingLoadService } from '../services/training-load.service.js';
import { TrendsService } from '../services/trends.service.js';
import { PulseAlertsService } from '../services/alerts.service.js';
import { TimelineService } from '../services/timeline.service.js';
import { PulseSchedulerService } from '../schedulers/pulse-scheduler.service.js';

interface JwtUser {
  sub: string;
  patientId?: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('pulse')
export class PulseController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly healthScore: PulseHealthScoreService,
    private readonly recovery: PulseRecoveryService,
    private readonly trainingLoad: TrainingLoadService,
    private readonly trends: TrendsService,
    private readonly alerts: PulseAlertsService,
    private readonly timeline: TimelineService,
    private readonly scheduler: PulseSchedulerService,
  ) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    return this.dashboard.getDashboard(patientId);
  }

  @Get('score')
  async getScore(
    @CurrentUser() user: JwtUser,
    @Query('days') days?: string,
  ) {
    const patientId = user.patientId ?? user.sub;
    if (days) {
      return this.healthScore.getRange(patientId, parseInt(days, 10));
    }
    return this.healthScore.getLatest(patientId);
  }

  @Get('recovery')
  getRecovery(@CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    return this.recovery.compute(patientId);
  }

  @Get('load')
  async getTrainingLoad(@CurrentUser() user: JwtUser, @Query('days') days?: string) {
    const patientId = user.patientId ?? user.sub;
    if (days) {
      return this.trainingLoad.getRange(patientId, parseInt(days, 10));
    }
    return this.trainingLoad.getLatest(patientId);
  }

  @Get('trends')
  async getTrends(
    @CurrentUser() user: JwtUser,
    @Query('periods') periods?: string,
  ) {
    const patientId = user.patientId ?? user.sub;
    const periodList = periods
      ? (periods.split(',') as Array<'7d' | '30d' | '90d' | '1y'>)
      : (['7d', '30d'] as const);
    return this.trends.computeTrends(patientId, [...periodList]);
  }

  @Get('alerts')
  getAlerts(@CurrentUser() user: JwtUser, @Query('unreadOnly') unreadOnly?: string) {
    const patientId = user.patientId ?? user.sub;
    return this.alerts.getAlerts(patientId, unreadOnly === 'true');
  }

  @Patch('alerts/:id/read')
  markAlertRead(@Param('id') id: string) {
    return this.alerts.markRead(id);
  }

  @Get('timeline')
  async getTimeline(
    @CurrentUser() user: JwtUser,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('limit') limit?: string,
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.timeline.getTimeline(
      patientId,
      since ? new Date(since) : undefined,
      until ? new Date(until) : undefined,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('compute')
  async triggerCompute(@CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    await this.scheduler.runAllForPatient(patientId);
    return { message: 'Computation triggered successfully' };
  }
}
