import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { OrganizationsService } from '../organizations/organizations.service';

describe('MembershipService', () => {
  let service: MembershipService;
  let prisma: {
    membership: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
  };
  let orgService: { assertOrgAdmin: jest.Mock };

  const baseMembership = {
    id: 'mem-1', organizationId: 'org-1', userId: 'user-2', role: 'PROFESSIONAL',
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      membership: {
        findFirst: jest.fn(), findMany: jest.fn(),
        count: jest.fn(), update: jest.fn(),
      },
    };
    orgService = { assertOrgAdmin: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: OrganizationsService, useValue: orgService },
      ],
    }).compile();

    service = module.get(MembershipService);
  });

  describe('listMembers', () => {
    it('returns paginated members', async () => {
      prisma.membership.findMany.mockResolvedValue([baseMembership]);
      prisma.membership.count.mockResolvedValue(1);

      const result = await service.listMembers('org-1', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('updateRole', () => {
    it('updates role when user is ADMIN and target is not OWNER', async () => {
      prisma.membership.findFirst.mockResolvedValue(baseMembership);
      prisma.membership.update.mockResolvedValue({ ...baseMembership, role: 'ASSISTANT' });

      const result = await service.updateRole('org-1', 'user-2', 'admin-1', { role: 'ASSISTANT' as any });
      expect(result.role).toBe('ASSISTANT');
    });

    it('throws ForbiddenException when trying to change OWNER role', async () => {
      prisma.membership.findFirst.mockResolvedValue({ ...baseMembership, role: 'OWNER' });

      await expect(service.updateRole('org-1', 'user-2', 'admin-1', { role: 'ADMIN' as any })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when member does not exist', async () => {
      prisma.membership.findFirst.mockResolvedValue(null);

      await expect(service.updateRole('org-1', 'ghost', 'admin-1', { role: 'ADMIN' as any })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates ForbiddenException from assertOrgAdmin', async () => {
      orgService.assertOrgAdmin.mockRejectedValue(new ForbiddenException());

      await expect(service.updateRole('org-1', 'user-2', 'user-1', { role: 'ADMIN' as any })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('soft deletes a member', async () => {
      prisma.membership.findFirst.mockResolvedValue(baseMembership);
      prisma.membership.update.mockResolvedValue({});

      await service.removeMember('org-1', 'user-2', 'admin-1');

      expect(prisma.membership.update).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws ForbiddenException when trying to remove OWNER', async () => {
      prisma.membership.findFirst.mockResolvedValue({ ...baseMembership, role: 'OWNER' });

      await expect(service.removeMember('org-1', 'user-2', 'admin-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when member does not exist', async () => {
      prisma.membership.findFirst.mockResolvedValue(null);

      await expect(service.removeMember('org-1', 'ghost', 'admin-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
