import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator.js';
import { SimulationService } from '../services/simulation.service.js';
import type { RunSimulationDto, CompareSimulationsDto } from '../dto/run-simulation.dto.js';

@Controller('simulation')
@UseGuards(JwtAuthGuard)
export class SimulationController {
  constructor(private readonly service: SimulationService) {}

  @Post('run')
  runSimulation(@Body() dto: RunSimulationDto, @CurrentUser() user: { sub: string }) {
    return this.service.runSimulation(dto, user.sub);
  }

  @Get('scenarios')
  getScenarios() {
    return this.service.getScenarios();
  }

  @Get('history')
  getHistory(@Query('patientId') patientId: string, @Query('tenantId') tenantId?: string) {
    return this.service.getHistory(patientId, tenantId);
  }

  @Post('compare')
  compareSimulations(@Body() dto: CompareSimulationsDto, @CurrentUser() user: { sub: string }) {
    return this.service.compareSimulations(dto, user.sub);
  }

  @Get(':id')
  getSimulation(@Param('id') id: string) {
    return this.service.getSimulation(id);
  }
}
