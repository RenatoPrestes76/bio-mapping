import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: {
    patient: {
      findFirst: jest.Mock; create: jest.Mock; update: jest.Mock;
      findMany: jest.Mock; count: jest.Mock;
    };
  };

  const basePatient = {
    id: 'pat-1', userId: 'user-1', registrationCode: 'PAT-ABCD1234',
    bloodType: null, height: null, weight: null, primaryProfessionalId: null, notes: null,
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      patient: {
        findFirst: jest.fn(), create: jest.fn(), update: jest.fn(),
        findMany: jest.fn(), count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(PatientsService);
  });

  describe('create', () => {
    it('creates a patient record with auto-generated registration code', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      prisma.patient.create.mockResolvedValue(basePatient);

      const result = await service.create('user-1', {});

      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', registrationCode: expect.stringMatching(/^PAT-/) }),
        }),
      );
      expect(result.userId).toBe('user-1');
    });

    it('throws ConflictException when patient record already exists', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      await expect(service.create('user-1', {})).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated patients', async () => {
      prisma.patient.findMany.mockResolvedValue([basePatient]);
      prisma.patient.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('returns a patient by id', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      const result = await service.findById('pat-1');
      expect(result.id).toBe('pat-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates patient fields', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      prisma.patient.update.mockResolvedValue({ ...basePatient, weight: 80 });

      const result = await service.update('pat-1', { weight: 80 }, 'user-1');
      expect(result.weight).toBe(80);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.update('missing', {}, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('soft deletes the patient record', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      prisma.patient.update.mockResolvedValue({});

      await service.delete('pat-1', 'user-1');

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'pat-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException when not found', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.delete('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
