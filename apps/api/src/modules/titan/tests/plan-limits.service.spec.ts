import { BadRequestException } from '@nestjs/common';
import { PlanLimitsService } from '../services/plan-limits.service.js';
import { OrganizationPlan } from '@bio/database';

const makeBranchRepo = (count = 0) => ({
  countByOrganization: jest.fn().mockResolvedValue(count),
});

const makePrisma = (org: unknown, memberCount = 0) => ({
  organization: { findFirst: jest.fn().mockResolvedValue(org) },
  membership: { count: jest.fn().mockResolvedValue(memberCount) },
});

const freeOrg = { id: 'org-1', name: 'Clínica A', plan: OrganizationPlan.FREE };
const enterpriseOrg = { id: 'org-2', name: 'Hospital B', plan: OrganizationPlan.ENTERPRISE };

describe('PlanLimitsService', () => {
  describe('getLimits', () => {
    let service: PlanLimitsService;
    beforeEach(() => {
      service = new PlanLimitsService(makeBranchRepo() as never, makePrisma(freeOrg) as never);
    });

    it('returns FREE limits', () => {
      const limits = service.getLimits(OrganizationPlan.FREE);
      expect(limits.maxUsers).toBe(5);
      expect(limits.maxBranches).toBe(1);
    });

    it('returns ENTERPRISE limits', () => {
      const limits = service.getLimits(OrganizationPlan.ENTERPRISE);
      expect(limits.maxUsers).toBe(10000);
      expect(limits.maxBranches).toBe(999);
    });

    it('PROFESSIONAL limits between FREE and ENTERPRISE', () => {
      const limits = service.getLimits(OrganizationPlan.PROFESSIONAL);
      expect(limits.maxUsers).toBeGreaterThan(5);
      expect(limits.maxUsers).toBeLessThan(10000);
    });
  });

  describe('assertCanAddUser', () => {
    it('does not throw when under limit', async () => {
      const service = new PlanLimitsService(makeBranchRepo() as never, makePrisma(freeOrg, 3) as never);
      await expect(service.assertCanAddUser('org-1')).resolves.toBeUndefined();
    });

    it('throws BadRequestException when at limit', async () => {
      const service = new PlanLimitsService(makeBranchRepo() as never, makePrisma(freeOrg, 5) as never);
      await expect(service.assertCanAddUser('org-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns without checking when org not found', async () => {
      const service = new PlanLimitsService(makeBranchRepo() as never, makePrisma(null) as never);
      await expect(service.assertCanAddUser('org-missing')).resolves.toBeUndefined();
    });
  });

  describe('assertCanAddBranch', () => {
    it('does not throw when under limit', async () => {
      const service = new PlanLimitsService(makeBranchRepo(0) as never, makePrisma(freeOrg) as never);
      await expect(service.assertCanAddBranch('org-1')).resolves.toBeUndefined();
    });

    it('throws when FREE org already has 1 branch (limit=1)', async () => {
      const service = new PlanLimitsService(makeBranchRepo(1) as never, makePrisma(freeOrg) as never);
      await expect(service.assertCanAddBranch('org-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows ENTERPRISE to have many branches', async () => {
      const service = new PlanLimitsService(makeBranchRepo(50) as never, makePrisma(enterpriseOrg) as never);
      await expect(service.assertCanAddBranch('org-2')).resolves.toBeUndefined();
    });
  });

  describe('getUsage', () => {
    it('returns usage metrics', async () => {
      const service = new PlanLimitsService(makeBranchRepo(1) as never, makePrisma(freeOrg, 3) as never);
      const usage = await service.getUsage('org-1');
      expect(usage?.plan).toBe(OrganizationPlan.FREE);
      expect(usage?.users.current).toBe(3);
      expect(usage?.users.limit).toBe(5);
      expect(usage?.users.pct).toBe(60);
      expect(usage?.branches.current).toBe(1);
    });

    it('returns null when org not found', async () => {
      const service = new PlanLimitsService(makeBranchRepo() as never, makePrisma(null) as never);
      const usage = await service.getUsage('org-missing');
      expect(usage).toBeNull();
    });
  });
});
