import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import { LongitudinalHealthService } from './longitudinal-health.service.js';
import { AnalyzeLongitudinalDto } from './dto/longitudinal-health.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('longitudinal-health')
export class LongitudinalHealthController {
  constructor(private readonly service: LongitudinalHealthService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeLongitudinalDto, @CurrentUser() _user: { sub: string }) {
    return this.service.analyze(dto);
  }

  @Get('report/:patientId')
  getReport(@Param('patientId') patientId: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getReport(patientId);
  }

  @Get('trends/:patientId')
  getTrends(@Param('patientId') patientId: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getTrends(patientId);
  }

  @Get('timeline/:patientId')
  getTimeline(@Param('patientId') patientId: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getTimeline(patientId);
  }
}
