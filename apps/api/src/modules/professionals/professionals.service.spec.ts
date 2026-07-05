import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;
  let prisma: {
    professional: {
      findFirst: jest.Mock; create: jest.Mock; update: jest.Mock;
      findMany: jest.Mock; count: jest.Mock;
    };
  };

  const baseProfessional = {
    id: 'pro-1', userId: 'user-1', specialty: 'DOCTOR',
    licenseNumber: 'CRM-12345', licenseState: 'SP', institution: 'Hospital A', bio: 'Bio',
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      professional: {
        findFirst: jest.fn(), create: jest.fn(), update: jest.fn(),
        findMany: jest.fn(), count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(ProfessionalsService);
  });

  describe('create', () => {
    it('creates a professional record', async () => {
      prisma.professional.findFirst.mockResolvedValue(null);
      prisma.professional.create.mockResolvedValue(baseProfessional);

      const result = await service.create('user-1', { specialty: 'DOCTOR' as any });
      expect(result.specialty).toBe('DOCTOR');
    });

    it('throws ConflictException when record already exists', async () => {
      prisma.professional.findFirst.mockResolvedValue(baseProfessional);
      await expect(service.create('user-1', { specialty: 'DOCTOR' as any })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated professionals', async () => {
      prisma.professional.findMany.mockResolvedValue([baseProfessional]);
      prisma.professional.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findById', () => {
    it('returns a professional by id', async () => {
      prisma.professional.findFirst.mockResolvedValue(baseProfessional);
      const result = await service.findById('pro-1');
      expect(result.id).toBe('pro-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.professional.findFirst.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateMine', () => {
    it('updates the professional record', async () => {
      prisma.professional.findFirst.mockResolvedValue(baseProfessional);
      prisma.professional.update.mockResolvedValue({ ...baseProfessional, bio: 'Updated bio' });

      const result = await service.updateMine('user-1', { bio: 'Updated bio' });
      expect(result.bio).toBe('Updated bio');
    });

    it('throws NotFoundException when record does not exist', async () => {
      prisma.professional.findFirst.mockResolvedValue(null);
      await expect(service.updateMine('user-1', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteMine', () => {
    it('soft deletes the professional record', async () => {
      prisma.professional.findFirst.mockResolvedValue(baseProfessional);
      prisma.professional.update.mockResolvedValue({});

      await service.deleteMine('user-1');

      expect(prisma.professional.update).toHaveBeenCalledWith({
        where: { id: 'pro-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException when record does not exist', async () => {
      prisma.professional.findFirst.mockResolvedValue(null);
      await expect(service.deleteMine('user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
