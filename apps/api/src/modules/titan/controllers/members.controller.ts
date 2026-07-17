import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MembershipRole } from '@bio/database';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { MembershipService } from '../../membership/membership.service.js';
import { InvitesService } from '../../invites/invites.service.js';
import { PlanLimitsService } from '../services/plan-limits.service.js';

@UseGuards(JwtAuthGuard)
@Controller('members')
export class MembersController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly invitesService: InvitesService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  @Get()
  listMembers(
    @Query('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.membershipService.listMembers(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('invite')
  async sendInvite(
    @CurrentUser() user: { sub: string },
    @Body() body: { organizationId: string; email: string; role: MembershipRole },
  ) {
    await this.planLimits.assertCanAddUser(body.organizationId);
    return this.invitesService.send(body.organizationId, user.sub, { email: body.email, role: body.role });
  }

  @Patch(':userId')
  updateMember(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { sub: string },
    @Body() body: { organizationId: string; role: MembershipRole },
  ) {
    return this.membershipService.updateRole(body.organizationId, targetUserId, user.sub, { role: body.role });
  }

  @Delete(':userId')
  removeMember(
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { sub: string },
    @Body() body: { organizationId: string },
  ) {
    return this.membershipService.removeMember(body.organizationId, targetUserId, user.sub);
  }
}
