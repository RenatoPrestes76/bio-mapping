import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@bio/database';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../identity/auth/guards/roles.guard.js';
import { Roles } from '../../../identity/auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator.js';
import { PopulationService } from '../services/population.service.js';

/** Achado da Sprint 03: este controller tinha apenas `JwtAuthGuard` (autenticação),
 * sem `RolesGuard`/`@Roles` (autorização) — qualquer usuário autenticado, incluindo
 * PATIENT, podia ler dashboards, tendências, risco e alertas de saúde populacional
 * de QUALQUER tenant, e confirmar alertas. Estes dados são agregados por tenant, não
 * por paciente individual — ferramenta de gestão clínica/administrativa, não deve
 * ser acessível a PATIENT. */
@Controller('population')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.PROFESSIONAL)
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
