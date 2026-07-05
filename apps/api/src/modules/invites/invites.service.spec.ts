import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { OrganizationsService } from '../organizations/organizations.service';

describe('InvitesService', () => {
  let service: InvitesService;
  let prisma: {
    invite: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    membership: { findFirst: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let orgService: { assertOrgAdmin: jest.Mock };

  const baseInvite = {
    id: 'inv-1', organizationId: 'org-1', invitedBy: 'admin-1',
    email: 'jane@example.com', role: 'PATIENT', token: 'abc123',
    status: 'PENDING', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    acceptedAt: null, rejectedAt: null, createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      invite: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      membership: { findFirst: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };
    orgService = { assertOrgAdmin: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: OrganizationsService, useValue: orgService },
      ],
    }).compile();

    service = module.get(InvitesService);
  });

  describe('send', () => {
    it('creates an invite when user is ADMIN', async () => {
      prisma.invite.create.mockResolvedValue(baseInvite);

      const result = await service.send('org-1', 'admin-1', { email: 'jane@example.com', role: 'PATIENT' as any });
      expect(result.email).toBe('jane@example.com');
    });

    it('propagates ForbiddenException when user is not admin', async () => {
      orgService.assertOrgAdmin.mockRejectedValue(new ForbiddenException());

      await expect(service.send('org-1', 'user-1', { email: 'x@x.com', role: 'PATIENT' as any })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('listMyInvites', () => {
    it('returns pending invites for the user email', async () => {
      prisma.invite.findMany.mockResolvedValue([baseInvite]);

      const result = await service.listMyInvites('jane@example.com');
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('jane@example.com');
    });
  });

  describe('accept', () => {
    it('creates a membership and marks invite as accepted', async () => {
      prisma.invite.findUnique.mockResolvedValue(baseInvite);
      prisma.membership.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([]);

      await service.accept('abc123', 'user-1', 'jane@example.com');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when invite does not exist', async () => {
      prisma.invite.findUnique.mockResolvedValue(null);
      await expect(service.accept('bad-token', 'user-1', 'jane@example.com')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when invite is expired', async () => {
      prisma.invite.findUnique.mockResolvedValue({ ...baseInvite, expiresAt: new Date(Date.now() - 1000) });
      await expect(service.accept('abc123', 'user-1', 'jane@example.com')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when email does not match', async () => {
      prisma.invite.findUnique.mockResolvedValue(baseInvite);
      await expect(service.accept('abc123', 'user-1', 'other@example.com')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException when user is already a member', async () => {
      prisma.invite.findUnique.mockResolvedValue(baseInvite);
      prisma.membership.findFirst.mockResolvedValue({ id: 'mem-1' });

      await expect(service.accept('abc123', 'user-1', 'jane@example.com')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('reject', () => {
    it('marks invite as rejected', async () => {
      prisma.invite.findUnique.mockResolvedValue(baseInvite);
      prisma.invite.update.mockResolvedValue({});

      await service.reject('abc123', 'user-1', 'jane@example.com');

      expect(prisma.invite.update).toHaveBeenCalledWith({
        where: { token: 'abc123' },
        data: { status: 'REJECTED', rejectedAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException when invite does not exist', async () => {
      prisma.invite.findUnique.mockResolvedValue(null);
      await expect(service.reject('bad', 'user-1', 'jane@example.com')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when email does not match', async () => {
      prisma.invite.findUnique.mockResolvedValue(baseInvite);
      await expect(service.reject('abc123', 'user-1', 'other@example.com')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
