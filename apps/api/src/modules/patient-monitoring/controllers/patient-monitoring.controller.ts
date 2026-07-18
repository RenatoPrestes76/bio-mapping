import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { PatientMonitoringService } from '../services/patient-monitoring.service.js';

@UseGuards(JwtAuthGuard)
@Controller('patient-monitoring')
export class PatientMonitoringController {
  constructor(private readonly service: PatientMonitoringService) {}

  @Get(':patientId/timeline')
  getTimeline(
    @Param('patientId') patientId: string,
    @CurrentUser() user: { sub: string },
    @Query('limit') limit?: string,
  ) {
    return this.service.getTimeline(patientId, limit ? Number(limit) : 100, user?.sub);
  }

  @Get(':patientId/summary')
  getSummary(@Param('patientId') patientId: string, @CurrentUser() user: { sub: string }) {
    return this.service.getSummary(patientId, user?.sub);
  }

  @Get(':patientId/events')
  getEvents(
    @Param('patientId') patientId: string,
    @CurrentUser() user: { sub: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.getEvents(
      patientId,
      { limit: limit ? Number(limit) : 50, offset: offset ? Number(offset) : 0 },
      user?.sub,
    );
  }
}
