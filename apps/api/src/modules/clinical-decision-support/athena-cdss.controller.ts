import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import { AthenaCdssService } from './services/athena-cdss.service.js';
import { EvaluatePatientDto } from './dto/athena-cdss.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('athena-cdss')
export class AthenaCdssController {
  constructor(private readonly service: AthenaCdssService) {}

  @Post('evaluate')
  evaluate(@Body() dto: EvaluatePatientDto, @CurrentUser() _user: { sub: string }) {
    return this.service.evaluate(dto);
  }

  @Get('decision/:id')
  getDecision(@Param('id') id: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getDecision(id);
  }

  @Get('alerts/:patientId')
  getAlerts(@Param('patientId') patientId: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getAlerts(patientId);
  }

  @Get('history/:patientId')
  getHistory(@Param('patientId') patientId: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getHistory(patientId);
  }
}
