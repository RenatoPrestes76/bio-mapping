import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { ConceptCategory } from './entities/medical-concept.entity.js';
import { RelationType } from './entities/concept-relation.entity.js';
import { MedicalOntologyService } from './medical-ontology.service.js';

@UseGuards(JwtAuthGuard)
@Controller('medical-ontology')
export class MedicalOntologyController {
  constructor(private readonly service: MedicalOntologyService) {}

  @Get('search')
  search(
    @Query('q') q = '',
    @Query('category') category?: ConceptCategory,
  ) {
    return { concepts: this.service.search(q, category) };
  }

  @Get('concepts')
  getConcepts(
    @Query('category') category?: ConceptCategory,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const all = this.service.search('', category);
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (p - 1) * l;
    return {
      items: all.slice(skip, skip + l),
      total: all.length,
      page: p,
      limit: l,
    };
  }

  @Get('relations')
  getRelations(
    @Query('conceptId') conceptId: string,
    @Query('type') type?: RelationType,
  ) {
    return { relations: this.service.findRelations(conceptId, type) };
  }

  @Get('graph')
  getGraph(@Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : undefined;
    return this.service.getGraph(l);
  }

  @Get('path')
  getPath(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.findShortestPath(from, to);
  }

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findConcept(id);
  }
}
