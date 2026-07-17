import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GoalType, RecommendationStatus } from '@bio/database';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator';
import { InsightEngineService } from '../services/insight-engine.service.js';
import { RecommendationService } from '../services/recommendation.service.js';
import { GoalsService } from '../services/goals.service.js';
import { PredictionsService } from '../services/predictions.service.js';
import { AegisDashboardService } from '../services/aegis-dashboard.service.js';
import { AegisSchedulerService } from '../schedulers/aegis-scheduler.service.js';
import { HealthInsightRepository } from '../repositories/health-insight.repository.js';

interface JwtUser {
  sub: string;
  patientId?: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('aegis')
export class AegisController {
  constructor(
    private readonly insightEngine: InsightEngineService,
    private readonly recommendations: RecommendationService,
    private readonly goals: GoalsService,
    private readonly predictions: PredictionsService,
    private readonly dashboard: AegisDashboardService,
    private readonly scheduler: AegisSchedulerService,
    private readonly insightRepo: HealthInsightRepository,
  ) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    return this.dashboard.getDashboard(patientId);
  }

  @Get('insights')
  getInsights(@CurrentUser() user: JwtUser, @Query('limit') limit?: string) {
    const patientId = user.patientId ?? user.sub;
    return this.insightRepo.findRecent(patientId, limit ? parseInt(limit, 10) : 20);
  }

  @Patch('insights/:id/read')
  markInsightRead(@Param('id') id: string) {
    return this.insightRepo.markRead(id);
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser() user: JwtUser, @Query('status') status?: string) {
    const patientId = user.patientId ?? user.sub;
    const parsedStatus = status ? (status as RecommendationStatus) : undefined;
    return this.recommendations.getRecommendations(patientId, parsedStatus);
  }

  @Patch('recommendations/:id')
  updateRecommendation(@Param('id') id: string, @Body() body: { status: RecommendationStatus }) {
    return this.recommendations.updateStatus(id, body.status);
  }

  @Get('goals')
  getGoals(@CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    return this.goals.getGoals(patientId);
  }

  @Post('goals')
  createGoal(@CurrentUser() user: JwtUser, @Body() body: { type: GoalType; target: number; notes?: string }) {
    const patientId = user.patientId ?? user.sub;
    return this.goals.setGoal(patientId, body.type, body.target, body.notes);
  }

  @Get('goals/progress')
  getGoalProgress(@CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    return this.goals.evaluateProgress(patientId);
  }

  @Get('predictions')
  getPredictions(@CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    return this.predictions.getPredictions(patientId);
  }

  @Get('history/recommendations')
  getRecommendationHistory(@CurrentUser() user: JwtUser, @Query('limit') limit?: string) {
    const patientId = user.patientId ?? user.sub;
    return this.recommendations.getHistory(patientId, limit ? parseInt(limit, 10) : 30);
  }

  @Post('compute')
  async triggerCompute(@CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    const result = await this.scheduler.runAllForPatient(patientId);
    return { message: 'AEGIS computation triggered successfully', ...result };
  }
}
