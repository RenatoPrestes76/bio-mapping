import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { TitanDashboardService } from '../services/titan-dashboard.service.js';
import { PlanLimitsService } from '../services/plan-limits.service.js';
import { OrgSettingsService } from '../services/org-settings.service.js';

@UseGuards(JwtAuthGuard)
@Controller('organization')
export class OrgDashboardController {
  constructor(
    private readonly dashboardService: TitanDashboardService,
    private readonly planLimits: PlanLimitsService,
    private readonly settingsService: OrgSettingsService,
  ) {}

  @Get('dashboard')
  getDashboard(@Query('organizationId') organizationId: string) {
    return this.dashboardService.getDashboard(organizationId);
  }

  @Get('settings')
  getSettings(@Query('organizationId') organizationId: string) {
    return this.settingsService.getSettings(organizationId);
  }

  @Get('usage')
  getUsage(@Query('organizationId') organizationId: string) {
    return this.planLimits.getUsage(organizationId);
  }
}
