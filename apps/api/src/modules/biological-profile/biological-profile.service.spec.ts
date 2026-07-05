import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BiologicalProfileService } from './biological-profile.service';
import { PrismaService } from '../../database/prisma.service';

describe('BiologicalProfileService', () => {
  let service: BiologicalProfileService;
  let prisma: { biologicalProfile: { findUnique: jest.Mock; upsert: jest.Mock } };

  const userId = 'user-1';

  beforeEach(async () => {
    prisma = { biologicalProfile: { findUnique: jest.fn(), upsert: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BiologicalProfileService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(BiologicalProfileService);
  });

  describe('getMine', () => {
    it('returns the profile when it exists', async () => {
      const profile = { id: 'profile-1', userId, height: 178 };
      prisma.biologicalProfile.findUnique.mockResolvedValue(profile);

      await expect(service.getMine(userId)).resolves.toEqual(profile);
    });

    it('throws NotFoundException when the profile was never created', async () => {
      prisma.biologicalProfile.findUnique.mockResolvedValue(null);

      await expect(service.getMine(userId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('upsertMine', () => {
    it('creates the profile on first write', async () => {
      const dto = { height: 178, weight: 74.5 };
      prisma.biologicalProfile.upsert.mockResolvedValue({ id: 'profile-1', userId, ...dto });

      await service.upsertMine(userId, dto);

      expect(prisma.biologicalProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: { userId, ...dto },
        update: { ...dto },
      });
    });

    it('updates the existing profile on subsequent writes', async () => {
      const dto = { weight: 76 };
      prisma.biologicalProfile.upsert.mockResolvedValue({ id: 'profile-1', userId, weight: 76 });

      const result = await service.upsertMine(userId, dto);

      expect(result.weight).toBe(76);
    });
  });
});
