import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../common/audit/audit-log.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    session: { updateMany: jest.Mock };
  };

  const baseUser = {
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'hashed',
    name: 'Jane Doe',
    birthDate: null,
    gender: null,
    role: 'PATIENT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      session: { updateMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('getMe', () => {
    it('returns the user without the passwordHash field', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.getMe(baseUser.id);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe(baseUser.email);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateMe', () => {
    it('updates the mutable profile fields', async () => {
      prisma.user.update.mockResolvedValue({ ...baseUser, name: 'New Name' });

      const result = await service.updateMe(baseUser.id, { name: 'New Name' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: { name: 'New Name', birthDate: undefined, gender: undefined },
      });
      expect(result.name).toBe('New Name');
    });
  });

  describe('changePassword', () => {
    it('hashes the new password, revokes all sessions, and logs the event', async () => {
      const passwordHash = await argon2.hash('OldPass123!');
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.user.update.mockResolvedValue({ ...baseUser });
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      await service.changePassword(baseUser.id, {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: baseUser.id } }),
      );
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: baseUser.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('throws UnauthorizedException for incorrect current password', async () => {
      const passwordHash = await argon2.hash('CorrectPass!');
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });

      await expect(
        service.changePassword(baseUser.id, {
          currentPassword: 'WrongPass!',
          newPassword: 'NewPass456!',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws BadRequestException when new password equals current password', async () => {
      const passwordHash = await argon2.hash('SamePass123!');
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });

      await expect(
        service.changePassword(baseUser.id, {
          currentPassword: 'SamePass123!',
          newPassword: 'SamePass123!',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', {
          currentPassword: 'AnyPass123!',
          newPassword: 'NewPass456!',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
