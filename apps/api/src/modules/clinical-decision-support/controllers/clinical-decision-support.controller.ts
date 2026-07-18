import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DecisionStatus } from '@bio/database';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { ClinicalDecisionSupportService } from '../services/clinical-decision-support.service.js';
import { PatientTriggerData } from '../interfaces/clinical-rule.interface.js';

@UseGuards(JwtAuthGuard)
@Controller('clinical-decisions')
export class ClinicalDecisionSupportController {
  constructor(private readonly service: ClinicalDecisionSupportService) {}

  @Post('evaluate')
  evaluate(
    @CurrentUser() user: { sub: string },
    @Body() body: { patientId: string; triggerData: PatientTriggerData; tenantId?: string },
  ) {
    return this.service.evaluate(body.patientId, body.triggerData, user.sub, body.tenantId);
  }

  @Get()
  findByPatient(
    @Query('patientId') patientId: string,
    @Query('status') status?: DecisionStatus,
  ) {
    return this.service.findByPatient(patientId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() body: { status: DecisionStatus },
  ) {
    return this.service.updateStatus(id, body.status, user.sub);
  }
}
