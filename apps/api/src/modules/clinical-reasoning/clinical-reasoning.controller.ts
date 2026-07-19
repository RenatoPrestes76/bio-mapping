import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { ClinicalReasoningService } from './clinical-reasoning.service.js';
import { AnalyzeCaseDto, SimulateCaseDto } from './dto/analyze-case.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('clinical-reasoning')
export class ClinicalReasoningController {
  constructor(private readonly service: ClinicalReasoningService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeCaseDto) {
    return this.service.analyze(dto);
  }

  @Post('infer')
  infer(@Body() dto: AnalyzeCaseDto) {
    return this.service.infer(dto);
  }

  @Post('simulate')
  simulate(@Body() dto: SimulateCaseDto) {
    return this.service.simulate(dto);
  }

  @Get(':id/explanation')
  getExplanation(@Param('id') id: string) {
    return this.service.explain(id);
  }

  @Get(':id/trace')
  getTrace(@Param('id') id: string) {
    return this.service.trace(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
