import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class OrgSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrganization(organizationId: string) {
    return this.prisma.organizationSettings.findUnique({ where: { organizationId } });
  }

  async upsert(organizationId: string, data: {
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
    return this.prisma.organizationSettings.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: data,
    });
  }
}
