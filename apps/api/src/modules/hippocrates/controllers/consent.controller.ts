import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { ConsentService } from '../services/consent.service.js';
import { ConsentStatus } from '@bio/database';

@UseGuards(JwtAuthGuard)
@Controller('consents')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get()
  listConsents(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Query('status') status?: ConsentStatus,
    @Query('patientId') patientId?: string,
  ) {
    const pid = patientId ?? user.patientId ?? user.sub;
    return this.consentService.listConsents(pid, status);
  }

  @Post()
  grantConsent(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Body() body: {
      organizationId: string;
      scopes: string[];
      validUntil?: string;
    },
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.consentService.grantConsent({
      patientId,
      organizationId: body.organizationId,
      grantedBy: user.sub,
      scopes: body.scopes,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
    });
  }

  @Delete(':id')
  revokeConsent(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() body?: { reason?: string },
  ) {
    return this.consentService.revokeConsent(id, user.sub, body?.reason);
  }

  @Get('check')
  checkConsent(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Query('organizationId') organizationId: string,
    @Query('scope') scope: string,
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.consentService.checkConsent(patientId, organizationId, scope);
  }
}
