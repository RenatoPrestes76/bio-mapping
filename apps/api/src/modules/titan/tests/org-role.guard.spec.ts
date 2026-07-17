import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { OrgRoleGuard } from '../guards/org-role.guard.js';
import { MembershipRole } from '@bio/database';

const makeReflector = (roles: MembershipRole[] | null) => ({
  get: jest.fn().mockReturnValue(roles),
});

const makePrisma = (membership: unknown = null) => ({
  membership: { findFirst: jest.fn().mockResolvedValue(membership) },
});

const makeContext = (user: unknown, params: Record<string, string> = {}, query: Record<string, string> = {}) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user, params, query }),
  }),
  getHandler: () => ({}),
});

describe('OrgRoleGuard', () => {
  describe('canActivate', () => {
    it('returns true when no roles required', async () => {
      const guard = new OrgRoleGuard(makeReflector(null) as never, makePrisma() as never);
      const result = await guard.canActivate(makeContext({ sub: 'user-1' }, { organizationId: 'org-1' }) as never);
      expect(result).toBe(true);
    });

    it('throws UnauthorizedException when no user', async () => {
      const guard = new OrgRoleGuard(makeReflector([MembershipRole.ADMIN]) as never, makePrisma() as never);
      await expect(
        guard.canActivate(makeContext(null, { organizationId: 'org-1' }) as never),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws ForbiddenException when no organizationId in params or query', async () => {
      const guard = new OrgRoleGuard(makeReflector([MembershipRole.ADMIN]) as never, makePrisma() as never);
      await expect(
        guard.canActivate(makeContext({ sub: 'user-1' }) as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when user lacks required role', async () => {
      const guard = new OrgRoleGuard(
        makeReflector([MembershipRole.ADMIN, MembershipRole.OWNER]) as never,
        makePrisma(null) as never,
      );
      await expect(
        guard.canActivate(makeContext({ sub: 'user-1' }, { organizationId: 'org-1' }) as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns true when user has required role', async () => {
      const membership = { id: 'm-1', role: MembershipRole.ADMIN };
      const guard = new OrgRoleGuard(
        makeReflector([MembershipRole.ADMIN]) as never,
        makePrisma(membership) as never,
      );
      const result = await guard.canActivate(
        makeContext({ sub: 'user-1' }, { organizationId: 'org-1' }) as never,
      );
      expect(result).toBe(true);
    });

    it('reads organizationId from query when not in params', async () => {
      const membership = { id: 'm-1', role: MembershipRole.OWNER };
      const prisma = makePrisma(membership);
      const guard = new OrgRoleGuard(
        makeReflector([MembershipRole.OWNER]) as never,
        prisma as never,
      );
      await guard.canActivate(makeContext({ sub: 'user-1' }, {}, { organizationId: 'org-1' }) as never);
      expect(prisma.membership.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) }),
      );
    });

    it('accepts MANAGER role when required', async () => {
      const membership = { id: 'm-1', role: MembershipRole.MANAGER };
      const guard = new OrgRoleGuard(
        makeReflector([MembershipRole.ADMIN, MembershipRole.MANAGER]) as never,
        makePrisma(membership) as never,
      );
      const result = await guard.canActivate(
        makeContext({ sub: 'user-1' }, { organizationId: 'org-1' }) as never,
      );
      expect(result).toBe(true);
    });

    it('blocks AUDITOR from admin-only route', async () => {
      const guard = new OrgRoleGuard(
        makeReflector([MembershipRole.ADMIN, MembershipRole.OWNER]) as never,
        makePrisma(null) as never,
      );
      await expect(
        guard.canActivate(makeContext({ sub: 'user-1' }, { organizationId: 'org-1' }) as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
