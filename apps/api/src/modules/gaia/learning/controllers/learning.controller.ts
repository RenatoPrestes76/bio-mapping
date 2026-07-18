import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator.js';
import { LearningService } from '../services/learning.service.js';
import { CreateOutcomeDto } from '../dto/create-outcome.dto.js';
import { CreateFeedbackDto } from '../dto/create-feedback.dto.js';

@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly service: LearningService) {}

  @Post('outcomes')
  registerOutcome(@Body() dto: CreateOutcomeDto, @CurrentUser() user: { sub: string }) {
    return this.service.registerOutcome(dto, user.sub);
  }

  @Get('outcomes/:id')
  findOutcome(@Param('id') id: string) {
    return this.service.findOutcome(id);
  }

  @Get('model-performance')
  getModelPerformance(@Query('tenantId') tenantId?: string) {
    return this.service.getModelPerformance(tenantId);
  }

  @Get('statistics')
  getStatistics(@Query('tenantId') tenantId?: string) {
    return this.service.getStatistics(tenantId);
  }

  @Get('drift')
  getDriftEvents(@Query('tenantId') tenantId?: string) {
    return this.service.getDriftEvents(tenantId);
  }

  @Post('feedback')
  registerFeedback(@Body() dto: CreateFeedbackDto, @CurrentUser() user: { sub: string }) {
    return this.service.registerFeedback(dto, user.sub);
  }

  @Get('feedback/history')
  getFeedbackHistory(@Query('decisionId') decisionId?: string, @Query('tenantId') tenantId?: string) {
    return this.service.getFeedbackHistory(decisionId, tenantId);
  }
}
