import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PathwayStatus, StepStatus } from '@bio/database';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { ClinicalPathwayService } from '../services/clinical-pathway.service.js';

@UseGuards(JwtAuthGuard)
@Controller('clinical-pathways')
export class ClinicalPathwayController {
  constructor(private readonly service: ClinicalPathwayService) {}

  @Post('start')
  start(
    @CurrentUser() user: { sub: string },
    @Body() body: { patientId: string; templateId: string; decisionId?: string; knowledgeId?: string; tenantId?: string },
  ) {
    return this.service.start(body, user.sub);
  }

  @Get()
  findByPatient(
    @Query('patientId') patientId: string,
    @Query('status') status?: PathwayStatus,
  ) {
    return this.service.findByPatient(patientId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/step')
  advanceStep(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() body: { stepId: string; status?: StepStatus },
  ) {
    return this.service.advanceStep(id, body, user.sub);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.complete(id, user.sub);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.cancel(id, user.sub);
  }
}
