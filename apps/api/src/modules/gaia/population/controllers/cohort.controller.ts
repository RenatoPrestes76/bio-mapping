import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator.js';
import { PopulationService } from '../services/population.service.js';
import type { CreateCohortDto, CompareCohortsDto } from '../dto/population.dto.js';

@Controller('cohorts')
@UseGuards(JwtAuthGuard)
export class CohortController {
  constructor(private readonly service: PopulationService) {}

  @Post()
  createCohort(@Body() dto: CreateCohortDto, @CurrentUser() user: { sub: string }) {
    return this.service.createCohort(dto, user.sub);
  }

  @Get(':id')
  getCohort(@Param('id') id: string) {
    return this.service.getCohort(id);
  }

  @Post('compare')
  compareCohortsById(@Body() dto: CompareCohortsDto, @CurrentUser() user: { sub: string }) {
    return this.service.compareCohortsById(dto, user.sub);
  }
}
