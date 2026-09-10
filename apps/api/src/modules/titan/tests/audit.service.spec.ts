import { ForbiddenException } from '@nestjs/common';
import { AuditService } from '../services/audit.service.js';

const event = {
  id: 'evt-1',
  action: 'ORG_CREATED',
  userId: 'user-1',
  organizationId: 'org-1',
  metadata: {},
  createdAt: new Date('2025-01-10'),
  user: { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
};

const makePrisma = (events: unknown[] = [event], total = 1, membership: unknown = { role: 'ADMIN' }) => ({
  auditLog: {
    findMany: jest.fn().mockResolvedValue(events),
    count: jest.fn().mockResolvedValue(total),
  },
  membership: {
    findFirst: jest.fn().mockResolvedValue(membership),
  },
});

const makeAuditLog = () => ({ log: jest.fn().mockResolvedValue(undefined) });

describe('AuditService', () => {
  let service: AuditService;
  let prisma: ReturnType<typeof makePrisma>;
  let auditLog: ReturnType<typeof makeAuditLog>;

  beforeEach(() => {
    prisma = makePrisma();
    auditLog = makeAuditLog();
    service = new AuditService(prisma as never, auditLog as never);
  });

  describe('query', () => {
    it('returns paginated events for an org admin', async () => {
      const result = await service.query({ organizationId: 'org-1' }, 'admin-1');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pages).toBe(1);
    });

    it('filters by organizationId', async () => {
      await service.query({ organizationId: 'org-1' }, 'admin-1');
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) }),
      );
    });

    it('filters by userId', async () => {
      await service.query({ organizationId: 'org-1', userId: 'user-1' }, 'admin-1');
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });

    it('filters by action (case insensitive contains)', async () => {
      await service.query({ organizationId: 'org-1', action: 'org_' }, 'admin-1');
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: expect.objectContaining({ contains: 'org_', mode: 'insensitive' }),
          }),
        }),
      );
    });

    it('filters by date range', async () => {
      await service.query({ organizationId: 'org-1', from: '2025-01-01', to: '2025-01-31' }, 'admin-1');
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: new Date('2025-01-01'), lte: new Date('2025-01-31') },
          }),
        }),
      );
    });

    it('paginates results', async () => {
      prisma.auditLog.count.mockResolvedValue(100);
      const result = await service.query({ organizationId: 'org-1', page: 2, limit: 10 }, 'admin-1');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(10);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('returns empty data when no events match', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);
      const result = await service.query({ organizationId: 'org-empty' }, 'admin-1');
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });

    it('SECURITY: throws ForbiddenException when actor has no OWNER/ADMIN membership in the org', async () => {
      prisma.membership.findFirst.mockResolvedValue(null);
      await expect(service.query({ organizationId: 'org-1' }, 'random-user')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('SECURITY: a MANAGER (not OWNER/ADMIN) cannot read the org audit log', async () => {
      prisma.membership.findFirst.mockResolvedValue(null); // service filters role in [OWNER,ADMIN] at the query level
      await expect(service.query({ organizationId: 'org-1' }, 'manager-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('logOrgEvent', () => {
    it('delegates to auditLog.log', async () => {
      await service.logOrgEvent('BRANCH_CREATED', {
        userId: 'user-1',
        organizationId: 'org-1',
        metadata: { branchId: 'branch-1' },
      });
      expect(auditLog.log).toHaveBeenCalledWith(
        'BRANCH_CREATED',
        expect.objectContaining({
          userId: 'user-1',
          metadata: expect.objectContaining({ organizationId: 'org-1', branchId: 'branch-1' }),
        }),
      );
    });
  });
});
