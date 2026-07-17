import { TitanDashboardService } from '../services/titan-dashboard.service.js';
import { EnrollmentStatus } from '@bio/database';

const makeBranchRepo = (branches: unknown[] = []) => ({
  findByOrganization: jest.fn().mockResolvedValue(branches),
  countByOrganization: jest.fn().mockResolvedValue(branches.length),
});

const makePlanLimits = (usage: unknown = null) => ({
  getUsage: jest.fn().mockResolvedValue(usage),
  getLimits: jest.fn(),
  assertCanAddUser: jest.fn(),
  assertCanAddBranch: jest.fn(),
});

const makePrisma = (overrides: Record<string, unknown> = {}) => ({
  membership: {
    count: jest.fn().mockResolvedValue(10),
    findMany: jest.fn().mockResolvedValue([
      { role: 'ADMIN' }, { role: 'PROFESSIONAL' }, { role: 'PROFESSIONAL' },
    ]),
  },
  auditLog: {
    findMany: jest.fn().mockResolvedValue([
      { id: 'evt-1', action: 'ORG_CREATED', user: null },
    ]),
  },
  careProgram: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  programEnrollment: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
  },
  ...overrides,
});

const activeBranch = { id: 'b-1', name: 'Unidade A', isActive: true, _count: { memberships: 5 } };
const inactiveBranch = { id: 'b-2', name: 'Unidade B', isActive: false, _count: { memberships: 0 } };

describe('TitanDashboardService', () => {
  describe('getDashboard', () => {
    it('returns summary with member counts', async () => {
      const service = new TitanDashboardService(
        makePrisma() as never,
        makeBranchRepo([activeBranch]) as never,
        makePlanLimits() as never,
      );
      const result = await service.getDashboard('org-1');
      expect(result.summary.totalBranches).toBe(1);
      expect(result.summary.activeBranches).toBe(1);
    });

    it('counts active vs inactive branches correctly', async () => {
      const service = new TitanDashboardService(
        makePrisma() as never,
        makeBranchRepo([activeBranch, inactiveBranch]) as never,
        makePlanLimits() as never,
      );
      const result = await service.getDashboard('org-1');
      expect(result.summary.totalBranches).toBe(2);
      expect(result.summary.activeBranches).toBe(1);
    });

    it('returns role distribution', async () => {
      const service = new TitanDashboardService(
        makePrisma() as never,
        makeBranchRepo() as never,
        makePlanLimits() as never,
      );
      const result = await service.getDashboard('org-1');
      expect(result.roleDistribution['PROFESSIONAL']).toBe(2);
      expect(result.roleDistribution['ADMIN']).toBe(1);
    });

    it('includes recent audit events', async () => {
      const service = new TitanDashboardService(
        makePrisma() as never,
        makeBranchRepo() as never,
        makePlanLimits() as never,
      );
      const result = await service.getDashboard('org-1');
      expect(result.recentAuditEvents).toHaveLength(1);
    });

    it('returns enrollment metrics when org has programs', async () => {
      const program = { id: 'prog-1', name: 'Emagrecimento', category: 'WEIGHT_LOSS' };
      const prisma = makePrisma({
        careProgram: { findMany: jest.fn().mockResolvedValue([program]) },
        programEnrollment: {
          count: jest.fn()
            .mockResolvedValueOnce(5)  // total
            .mockResolvedValueOnce(3)  // active
            .mockResolvedValueOnce(2), // completed
          findMany: jest.fn().mockResolvedValue([{ adherencePct: 80 }, { adherencePct: 70 }, { adherencePct: 90 }]),
        },
      });
      const service = new TitanDashboardService(prisma as never, makeBranchRepo() as never, makePlanLimits() as never);
      const result = await service.getDashboard('org-1');
      expect(result.enrollment.total).toBe(5);
      expect(result.enrollment.active).toBe(3);
      expect(result.enrollment.avgAdherence).toBe(80);
    });

    it('generates HIGH alert when user usage >= 90%', async () => {
      const planUsage = {
        plan: 'FREE',
        users: { current: 5, limit: 5, pct: 100 },
        branches: { current: 0, limit: 1, pct: 0 },
        apiCallsMonthlyLimit: 1000,
      };
      const service = new TitanDashboardService(
        makePrisma() as never,
        makeBranchRepo() as never,
        makePlanLimits(planUsage) as never,
      );
      const result = await service.getDashboard('org-1');
      const alert = result.alerts.find((a: { type: string }) => a.type === 'PLAN_USER_LIMIT');
      expect(alert?.severity).toBe('HIGH');
    });

    it('generates generatedAt timestamp', async () => {
      const service = new TitanDashboardService(makePrisma() as never, makeBranchRepo() as never, makePlanLimits() as never);
      const result = await service.getDashboard('org-1');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });
  });
});
