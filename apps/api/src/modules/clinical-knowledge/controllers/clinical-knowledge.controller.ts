import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { ClinicalKnowledgeService } from '../services/clinical-knowledge.service.js';
import { CLINICAL_DOMAINS } from '../knowledge/categories.js';

@UseGuards(JwtAuthGuard)
@Controller('clinical-knowledge')
export class ClinicalKnowledgeController {
  constructor(private readonly service: ClinicalKnowledgeService) {}

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() body: {
      tenantId?: string;
      category: ClinicalKnowledgeCategory;
      title: string;
      description?: string;
      clinicalCode?: string;
      source?: string;
      evidenceLevel: EvidenceLevel;
      language?: string;
      status?: KnowledgeStatus;
      tags?: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.service.create(body, user.sub);
  }

  @Get()
  search(
    @Query('category') category?: ClinicalKnowledgeCategory,
    @Query('status') status?: KnowledgeStatus,
    @Query('evidenceLevel') evidenceLevel?: EvidenceLevel,
    @Query('clinicalCode') clinicalCode?: string,
    @Query('source') source?: string,
    @Query('text') text?: string,
    @Query('tenantId') tenantId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.search({
      category,
      status,
      evidenceLevel,
      clinicalCode,
      source,
      text,
      tenantId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('search')
  searchKnowledge(@Query('q') q = '') {
    return this.service.searchKnowledge(q);
  }

  @Get('categories')
  getCategories() {
    return { categories: CLINICAL_DOMAINS };
  }

  @Get('rules')
  getRules(@Query('category') category?: string) {
    return { rules: this.service.findRules(category) };
  }

  @Get('guidelines')
  getGuidelines(@Query('tags') rawTags?: string) {
    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    return { guidelines: this.service.findGuidelines(tags) };
  }

  @Get('references')
  getReferences(@Query('tags') rawTags?: string, @Query('language') language?: string) {
    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    return { references: this.service.findReferences({ tags, language }) };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() body: {
      category?: ClinicalKnowledgeCategory;
      title?: string;
      description?: string;
      clinicalCode?: string;
      source?: string;
      evidenceLevel?: EvidenceLevel;
      language?: string;
      status?: KnowledgeStatus;
      tags?: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.service.update(id, body, user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.delete(id, user.sub);
  }
}
