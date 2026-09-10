import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@bio/database';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../identity/auth/guards/roles.guard.js';
import { Roles } from '../../../identity/auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator.js';
import { PopulationService } from '../services/population.service.js';
import type { CreateCohortDto, CompareCohortsDto } from '../dto/population.dto.js';

/** Mesmo achado do `PopulationController` — coortes de população também são
 * ferramenta clínica/administrativa agregada por tenant, não dado individual
 * do paciente; PATIENT nunca deveria criar/ler/comparar coortes. */
@Controller('cohorts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.PROFESSIONAL)
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
