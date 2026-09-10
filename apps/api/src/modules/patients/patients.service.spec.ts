import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface';

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

  const owner: JwtPayload = { sub: 'user-1', email: 'owner@example.com', role: 'PATIENT' };
  const otherPatient: JwtPayload = { sub: 'user-2', email: 'other@example.com', role: 'PATIENT' };
  const admin: JwtPayload = { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
  const assignedProfessional: JwtPayload = { sub: 'prof-1', email: 'prof@example.com', role: 'PROFESSIONAL' };
  const unassignedProfessional: JwtPayload = { sub: 'prof-2', email: 'prof2@example.com', role: 'PROFESSIONAL' };

  const patientWithProfessional = { ...basePatient, primaryProfessionalId: 'prof-1' };

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
    it('returns paginated patients for a professional', async () => {
      prisma.patient.findMany.mockResolvedValue([basePatient]);
      prisma.patient.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 }, assignedProfessional);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('returns paginated patients for an admin', async () => {
      prisma.patient.findMany.mockResolvedValue([basePatient]);
      prisma.patient.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 20 }, admin);
      expect(result.total).toBe(1);
    });

    it('SECURITY: forbids a PATIENT from listing the full patient roster', async () => {
      await expect(service.findAll({ page: 1, limit: 20 }, owner)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.patient.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns a patient by id to its own owner', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      const result = await service.findById('pat-1', owner);
      expect(result.id).toBe('pat-1');
    });

    it('returns a patient by id to an admin', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      const result = await service.findById('pat-1', admin);
      expect(result.id).toBe('pat-1');
    });

    it('returns a patient by id to the assigned professional', async () => {
      prisma.patient.findFirst.mockResolvedValue(patientWithProfessional);
      const result = await service.findById('pat-1', assignedProfessional);
      expect(result.id).toBe('pat-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.findById('missing', owner)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('SECURITY (IDOR): a different PATIENT cannot read another patient\'s record', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      await expect(service.findById('pat-1', otherPatient)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('SECURITY: an unassigned professional cannot read a patient they are not responsible for', async () => {
      prisma.patient.findFirst.mockResolvedValue(patientWithProfessional);
      await expect(service.findById('pat-1', unassignedProfessional)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('update', () => {
    it('updates patient fields when the actor is the owner', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      prisma.patient.update.mockResolvedValue({ ...basePatient, weight: 80 });

      const result = await service.update('pat-1', { weight: 80 }, owner);
      expect(result.weight).toBe(80);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.update('missing', {}, owner)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('SECURITY (IDOR): a different PATIENT cannot overwrite another patient\'s record', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      await expect(service.update('pat-1', { notes: 'hacked' }, otherPatient)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.patient.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('soft deletes the patient record when the actor is the owner', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      prisma.patient.update.mockResolvedValue({});

      await service.delete('pat-1', owner);

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'pat-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException when not found', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.delete('missing', owner)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('SECURITY (IDOR): a different PATIENT cannot delete another patient\'s record', async () => {
      prisma.patient.findFirst.mockResolvedValue(basePatient);
      await expect(service.delete('pat-1', otherPatient)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.patient.update).not.toHaveBeenCalled();
    });
  });
});
