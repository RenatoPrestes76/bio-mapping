import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.dashboard.getDashboard(user);
  }
}
