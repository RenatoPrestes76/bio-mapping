import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import { GaiaClinicalDecisionService } from './clinical-decision-support.service.js';
import { AnalyzeClinicalDecisionDto } from './dto/clinical-decision-support.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('clinical-decision-support')
export class GaiaClinicalDecisionController {
  constructor(private readonly service: GaiaClinicalDecisionService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeClinicalDecisionDto, @CurrentUser() _user: { sub: string }) {
    return this.service.analyze(dto);
  }

  @Get('report/:patientId')
  getReport(@Param('patientId') patientId: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getReport(patientId);
  }

  @Get(':id')
  getDecision(@Param('id') id: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getDecision(id);
  }
}
