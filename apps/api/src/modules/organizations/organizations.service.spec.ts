import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: {
    organization: { findFirst: jest.Mock; update: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    membership: { findFirst: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };

  const baseOrg = {
    id: 'org-1', name: 'Clínica A', document: null, logo: null,
    plan: 'FREE', status: 'ACTIVE',
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      organization: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      membership: { findFirst: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(OrganizationsService);
  });

  describe('create', () => {
    it('creates org and OWNER membership in a transaction', async () => {
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.organization.create = jest.fn().mockResolvedValue(baseOrg);
      prisma.membership.create.mockResolvedValue({});

      const result = await service.create('user-1', { name: 'Clínica A' });
      expect(result.name).toBe('Clínica A');
    });
  });

  describe('findById', () => {
    it('returns organization', async () => {
      prisma.organization.findFirst.mockResolvedValue(baseOrg);
      const result = await service.findById('org-1');
      expect(result.id).toBe('org-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.organization.findFirst.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findMyOrganizations', () => {
    it('returns paginated organizations', async () => {
      prisma.organization.findMany.mockResolvedValue([baseOrg]);
      prisma.organization.count.mockResolvedValue(1);

      const result = await service.findMyOrganizations('user-1', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('updates organization when user is ADMIN', async () => {
      prisma.membership.findFirst.mockResolvedValue({ role: 'ADMIN' });
      prisma.organization.update.mockResolvedValue({ ...baseOrg, name: 'Updated' });

      const result = await service.update('org-1', 'user-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws ForbiddenException when user is not admin', async () => {
      prisma.membership.findFirst.mockResolvedValue(null);
      await expect(service.update('org-1', 'user-1', { name: 'X' })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('soft deletes when user is OWNER', async () => {
      prisma.membership.findFirst.mockResolvedValue({ role: 'OWNER' });
      prisma.organization.update.mockResolvedValue({});

      await service.delete('org-1', 'user-1');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws ForbiddenException when user is not OWNER', async () => {
      prisma.membership.findFirst.mockResolvedValue(null);
      await expect(service.delete('org-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('assertOrgAdmin', () => {
    it('does not throw when user is OWNER or ADMIN', async () => {
      prisma.membership.findFirst.mockResolvedValue({ role: 'OWNER' });
      await expect(service.assertOrgAdmin('org-1', 'user-1')).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when not admin', async () => {
      prisma.membership.findFirst.mockResolvedValue(null);
      await expect(service.assertOrgAdmin('org-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
