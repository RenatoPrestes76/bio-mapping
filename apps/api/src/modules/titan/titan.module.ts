import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { MembershipModule } from '../membership/membership.module.js';
import { InvitesModule } from '../invites/invites.module.js';

import { BranchRepository } from './repositories/branch.repository.js';
import { OrgSettingsRepository } from './repositories/org-settings.repository.js';

import { BranchService } from './services/branch.service.js';
import { OrgSettingsService } from './services/org-settings.service.js';
import { TitanDashboardService } from './services/titan-dashboard.service.js';
import { AuditService } from './services/audit.service.js';
import { PlanLimitsService } from './services/plan-limits.service.js';

import { OrgRoleGuard } from './guards/org-role.guard.js';

import { BranchesController } from './controllers/branches.controller.js';
import { OrgDashboardController } from './controllers/org-dashboard.controller.js';
import { AuditController } from './controllers/audit.controller.js';
import { OrgSettingsController } from './controllers/org-settings.controller.js';
import { MembersController } from './controllers/members.controller.js';

@Module({
  imports: [DatabaseModule, MembershipModule, InvitesModule],
  controllers: [
    BranchesController,
    OrgDashboardController,
    AuditController,
    OrgSettingsController,
    MembersController,
  ],
  providers: [
    BranchRepository,
    OrgSettingsRepository,
    BranchService,
    OrgSettingsService,
    TitanDashboardService,
    AuditService,
    PlanLimitsService,
    OrgRoleGuard,
  ],
  exports: [BranchService, OrgSettingsService, TitanDashboardService, AuditService, PlanLimitsService, OrgRoleGuard],
})
export class TitanModule {}
