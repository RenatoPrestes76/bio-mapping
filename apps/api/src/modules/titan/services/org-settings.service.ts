import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrgSettingsRepository } from '../repositories/org-settings.repository.js';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class OrgSettingsService {
  constructor(
    private readonly repo: OrgSettingsRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async assertAdmin(organizationId: string, userId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId, role: { in: ['OWNER', 'ADMIN'] }, deletedAt: null },
    });
    if (!membership) throw new ForbiddenException('Permissão insuficiente na organização');
  }

  private async assertMember(organizationId: string, userId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId, role: { in: ['OWNER', 'ADMIN', 'MANAGER'] }, deletedAt: null },
    });
    if (!membership) throw new ForbiddenException('Permissão insuficiente na organização');
  }

  async getSettings(organizationId: string, actorId: string) {
    await this.assertMember(organizationId, actorId);
    const settings = await this.repo.findByOrganization(organizationId);
    if (!settings) {
      return {
        organizationId,
        maxUsers: null,
        maxBranches: null,
        apiCallsMonthly: null,
        ssoEnabled: false,
        ssoProvider: null,
        ssoConfig: null,
        allowedDomains: [],
        webhookUrl: null,
        notifyOnLogin: false,
      };
    }
    return settings;
  }

  async updateSettings(organizationId: string, actorId: string, data: {
    maxUsers?: number;
    maxBranches?: number;
    apiCallsMonthly?: number;
    ssoEnabled?: boolean;
    ssoProvider?: string;
    ssoConfig?: Record<string, unknown>;
    allowedDomains?: string[];
    webhookUrl?: string;
    notifyOnLogin?: boolean;
  }) {
    await this.assertAdmin(organizationId, actorId);
    return this.repo.upsert(organizationId, data);
  }
}
