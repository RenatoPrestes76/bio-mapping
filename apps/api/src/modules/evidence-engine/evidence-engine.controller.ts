import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { EvidenceEngineService } from './evidence-engine.service.js';
import { EvidenceSource, EvidenceLanguage } from './entities/evidence.entity.js';

@UseGuards(JwtAuthGuard)
@Controller('evidence')
export class EvidenceEngineController {
  constructor(private readonly service: EvidenceEngineService) {}

  @Get('search')
  search(
    @Query('q') q = '',
    @Query('source') source?: EvidenceSource,
    @Query('language') language?: EvidenceLanguage,
  ) {
    return { evidence: this.service.search(q, source, language) };
  }

  @Get('topic')
  getByTopic(@Query('topic') topic = '') {
    return { evidence: this.service.findByTopic(topic) };
  }

  @Get('condition')
  getByCondition(@Query('condition') condition = '') {
    return { evidence: this.service.getSupportingStudies(condition) };
  }

  @Get('guidelines')
  getByGuideline(@Query('guidelineId') guidelineId = '') {
    return { evidence: this.service.findByGuideline(guidelineId) };
  }

  @Get('summary')
  getSummary(@Query('id') id: string) {
    return this.service.getEvidenceSummary(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.getEvidence(id);
  }
}
