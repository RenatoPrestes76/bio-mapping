import { Injectable } from '@nestjs/common';
import { OrgSettingsRepository } from '../repositories/org-settings.repository.js';

@Injectable()
export class OrgSettingsService {
  constructor(private readonly repo: OrgSettingsRepository) {}

  async getSettings(organizationId: string) {
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

  async updateSettings(organizationId: string, data: {
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
    return this.repo.upsert(organizationId, data);
  }
}
