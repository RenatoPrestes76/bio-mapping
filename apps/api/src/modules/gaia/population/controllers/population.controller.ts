import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator.js';
import { PopulationService } from '../services/population.service.js';

@Controller('population')
@UseGuards(JwtAuthGuard)
export class PopulationController {
  constructor(private readonly service: PopulationService) {}

  @Get('dashboard')
  getDashboard(
    @Query('tenantId') tenantId: string,
    @Query('cohortId') cohortId?: string,
  ) {
    return this.service.getPopulationDashboard({ tenantId, cohortId });
  }

  @Get('trends')
  getTrends(
    @Query('tenantId') tenantId: string,
    @Query('cohortId') cohortId?: string,
  ) {
    return this.service.getPopulationTrends({ tenantId, cohortId });
  }

  @Get('risk')
  getRisk(@Query('tenantId') tenantId: string, @Query('cohortId') cohortId?: string) {
    return this.service.getPopulationRisk({ tenantId, cohortId });
  }

  @Get('alerts')
  getAlerts(@Query('tenantId') tenantId: string) {
    return this.service.getPopulationAlerts(tenantId);
  }

  @Patch('alerts/:id/acknowledge')
  acknowledgeAlert(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.acknowledgeAlert(id, user.sub);
  }
}
