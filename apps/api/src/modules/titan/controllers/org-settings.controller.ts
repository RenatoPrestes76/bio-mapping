import { Body, Controller, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { OrgSettingsService } from '../services/org-settings.service.js';

@UseGuards(JwtAuthGuard)
@Controller('organization/settings')
export class OrgSettingsController {
  constructor(private readonly settingsService: OrgSettingsService) {}

  @Patch()
  updateSettings(
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: { sub: string },
    @Body() body: {
      maxUsers?: number;
      maxBranches?: number;
      ssoEnabled?: boolean;
      ssoProvider?: string;
      ssoConfig?: Record<string, unknown>;
      allowedDomains?: string[];
      webhookUrl?: string;
      notifyOnLogin?: boolean;
    },
  ) {
    return this.settingsService.updateSettings(organizationId, user.sub, body);
  }
}
