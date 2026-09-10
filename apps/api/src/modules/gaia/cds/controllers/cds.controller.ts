import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator.js';
import { CdsService } from '../services/cds.service.js';
import type { EvaluateCdsDto } from '../dto/evaluate-cds.dto.js';
import type { DecisionFeedbackDto } from '../dto/decision-feedback.dto.js';

@Controller('clinical-decision')
@UseGuards(JwtAuthGuard)
export class CdsController {
  constructor(private readonly service: CdsService) {}

  @Post('evaluate')
  evaluate(@Body() dto: EvaluateCdsDto, @CurrentUser() user: { sub: string; role: string }) {
    return this.service.evaluate(dto, user);
  }

  @Get('history')
  getHistory(
    @Query('patientId') patientId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.service.findHistory(patientId, user, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('alerts')
  getAlerts(
    @Query('patientId') patientId: string,
    @Query('unreadOnly') unreadOnly: string,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.service.getAlerts(patientId, user, unreadOnly === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.service.findById(id, user);
  }

  @Post(':id/recalculate')
  @HttpCode(HttpStatus.OK)
  recalculate(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.service.recalculate(id, user);
  }

  @Get(':id/explanation')
  getExplanation(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.service.getExplanation(id, user);
  }

  @Post(':id/feedback')
  addFeedback(
    @Param('id') id: string,
    @Body() dto: DecisionFeedbackDto,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.service.addFeedback(id, dto, user);
  }

  @Post('alerts/:alertId/read')
  @HttpCode(HttpStatus.OK)
  markAlertRead(@Param('alertId') alertId: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.service.markAlertRead(alertId, user);
  }
}
