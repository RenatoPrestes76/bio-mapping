import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { STORAGE_PROVIDER } from '../../common/storage/storage.provider';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let prisma: { profile: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock } };
  let storage: { upload: jest.Mock; delete: jest.Mock };

  const baseProfile = {
    id: 'profile-1', userId: 'user-1', fullName: 'Jane Doe', cpf: null,
    birthDate: null, gender: null, phone: null, photo: null,
    address: null, city: null, state: null, country: 'BR',
    zipcode: null, timezone: 'America/Sao_Paulo', language: 'pt-BR',
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  };

  beforeEach(async () => {
    prisma = { profile: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } };
    storage = { upload: jest.fn(), delete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: STORAGE_PROVIDER, useValue: storage },
      ],
    }).compile();

    service = module.get(ProfilesService);
  });

  describe('create', () => {
    it('creates a profile when none exists', async () => {
      prisma.profile.findFirst.mockResolvedValue(null);
      prisma.profile.create.mockResolvedValue(baseProfile);

      const result = await service.create('user-1', { fullName: 'Jane Doe' });

      expect(prisma.profile.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1', fullName: 'Jane Doe' }) }),
      );
      expect(result.fullName).toBe('Jane Doe');
    });

    it('throws ConflictException when profile already exists', async () => {
      prisma.profile.findFirst.mockResolvedValue(baseProfile);

      await expect(service.create('user-1', { fullName: 'Jane Doe' })).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.profile.create).not.toHaveBeenCalled();
    });
  });

  describe('getMyProfile', () => {
    it('returns the profile', async () => {
      prisma.profile.findFirst.mockResolvedValue(baseProfile);

      const result = await service.getMyProfile('user-1');
      expect(result.id).toBe('profile-1');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      prisma.profile.findFirst.mockResolvedValue(null);
      await expect(service.getMyProfile('user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates profile fields', async () => {
      prisma.profile.findFirst.mockResolvedValue(baseProfile);
      prisma.profile.update.mockResolvedValue({ ...baseProfile, fullName: 'Jane Updated' });

      const result = await service.update('user-1', { fullName: 'Jane Updated' });
      expect(result.fullName).toBe('Jane Updated');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      prisma.profile.findFirst.mockResolvedValue(null);
      await expect(service.update('user-1', { fullName: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('sets deletedAt on the profile', async () => {
      prisma.profile.findFirst.mockResolvedValue(baseProfile);
      prisma.profile.update.mockResolvedValue({});

      await service.delete('user-1');

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException when profile does not exist', async () => {
      prisma.profile.findFirst.mockResolvedValue(null);
      await expect(service.delete('user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('uploadAvatar', () => {
    const mockFile = { originalname: 'avatar.jpg', buffer: Buffer.from('img'), mimetype: 'image/jpeg' } as any;

    it('uploads the file and updates the photo field', async () => {
      prisma.profile.findFirst.mockResolvedValue(baseProfile);
      storage.upload.mockResolvedValue('/uploads/avatars/uuid.jpg');
      prisma.profile.update.mockResolvedValue({ ...baseProfile, photo: '/uploads/avatars/uuid.jpg' });

      const result = await service.uploadAvatar('user-1', mockFile);
      expect(storage.upload).toHaveBeenCalledWith(mockFile, 'avatars');
      expect(result.photo).toBe('/uploads/avatars/uuid.jpg');
    });

    it('deletes the old avatar before uploading a new one', async () => {
      prisma.profile.findFirst.mockResolvedValue({ ...baseProfile, photo: '/uploads/avatars/old.jpg' });
      storage.delete.mockResolvedValue(undefined);
      storage.upload.mockResolvedValue('/uploads/avatars/new.jpg');
      prisma.profile.update.mockResolvedValue({ ...baseProfile, photo: '/uploads/avatars/new.jpg' });

      await service.uploadAvatar('user-1', mockFile);
      expect(storage.delete).toHaveBeenCalledWith('/uploads/avatars/old.jpg');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      prisma.profile.findFirst.mockResolvedValue(null);
      await expect(service.uploadAvatar('user-1', mockFile)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
