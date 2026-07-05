import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BiomarkersService } from '../services/biomarkers.service';
import { AuditLogService } from '../../../common/audit/audit-log.service';
import { PrismaService } from '../../../database/prisma.service';

const makeVitalRecord = (overrides = {}) => ({
  id: 'vital-1',
  patientId: 'patient-1',
  deletedAt: null,
  patient: { userId: 'user-patient', primaryProfessionalId: null },
  ...overrides,
});

const makeBiomarker = (overrides = {}) => ({
  id: 'bio-1',
  vitalRecordId: 'vital-1',
  name: 'Glicose',
  value: 95,
  unit: 'mg/dL',
  referenceMin: 70,
  referenceMax: 99,
  status: 'NORMAL',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('BiomarkersService', () => {
  let service: BiomarkersService;
  let prisma: any;
  let audit: jest.Mocked<AuditLogService>;

  const patientActor = { sub: 'user-patient', role: 'PATIENT' };
  const adminActor = { sub: 'user-admin', role: 'ADMIN' };
  const context = { ip: '127.0.0.1', userAgent: 'jest' };

  beforeEach(async () => {
    const mockPrisma = {
      vitalRecord: { findFirst: jest.fn() },
      biomarker: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      professional: { findFirst: jest.fn() },
      membership: { findFirst: jest.fn() },
    };

    const mockAudit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiomarkersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(BiomarkersService);
    prisma = module.get(PrismaService);
    audit = module.get(AuditLogService);
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('cria biomarcador com status NORMAL para valor dentro da faixa', async () => {
      const record = makeVitalRecord();
      const bio = makeBiomarker();
      prisma.vitalRecord.findFirst.mockResolvedValue(record);
      prisma.biomarker.create.mockResolvedValue(bio);

      const result = await service.create(
        'vital-1',
        { name: 'Glicose', value: 95, unit: 'mg/dL', referenceMin: 70, referenceMax: 99 },
        patientActor,
        context,
      );

      expect(prisma.biomarker.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'NORMAL' }) }),
      );
      expect(result.name).toBe('Glicose');
      expect(audit.log).toHaveBeenCalledWith('BIOMARKER_CREATED', expect.any(Object));
    });

    it('deriva status HIGH quando valor excede referenceMax', async () => {
      const record = makeVitalRecord();
      const bio = makeBiomarker({ value: 130, status: 'HIGH' });
      prisma.vitalRecord.findFirst.mockResolvedValue(record);
      prisma.biomarker.create.mockResolvedValue(bio);

      await service.create(
        'vital-1',
        { name: 'Glicose', value: 130, unit: 'mg/dL', referenceMin: 70, referenceMax: 99 },
        patientActor,
        context,
      );

      expect(prisma.biomarker.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'HIGH' }) }),
      );
    });

    it('deriva status LOW quando valor está abaixo de referenceMin', async () => {
      const record = makeVitalRecord();
      const bio = makeBiomarker({ value: 60, status: 'LOW' });
      prisma.vitalRecord.findFirst.mockResolvedValue(record);
      prisma.biomarker.create.mockResolvedValue(bio);

      await service.create(
        'vital-1',
        { name: 'Glicose', value: 60, unit: 'mg/dL', referenceMin: 70, referenceMax: 99 },
        patientActor,
        context,
      );

      expect(prisma.biomarker.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'LOW' }) }),
      );
    });

    it('status NORMAL quando não há faixa de referência', async () => {
      const record = makeVitalRecord();
      prisma.vitalRecord.findFirst.mockResolvedValue(record);
      prisma.biomarker.create.mockResolvedValue(makeBiomarker());

      await service.create(
        'vital-1',
        { name: 'Ferritina', value: 120, unit: 'ng/mL' },
        patientActor,
        context,
      );

      expect(prisma.biomarker.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'NORMAL' }) }),
      );
    });

    it('lança NotFoundException se registro vital não existir', async () => {
      prisma.vitalRecord.findFirst.mockResolvedValue(null);
      await expect(
        service.create('no-vital', { name: 'Glicose', value: 95, unit: 'mg/dL' }, adminActor, context),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException se paciente tentar acessar registro de outro', async () => {
      const record = makeVitalRecord({ patient: { userId: 'other-user', primaryProfessionalId: null } });
      prisma.vitalRecord.findFirst.mockResolvedValue(record);
      await expect(
        service.create('vital-1', { name: 'Glicose', value: 95, unit: 'mg/dL' }, patientActor, context),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna lista de biomarcadores do registro', async () => {
      const record = makeVitalRecord();
      prisma.vitalRecord.findFirst.mockResolvedValue(record);
      prisma.biomarker.findMany.mockResolvedValue([makeBiomarker()]);

      const result = await service.findAll('vital-1', patientActor);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Glicose');
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('atualiza valor e recalcula status', async () => {
      const bio = makeBiomarker();
      const record = makeVitalRecord();
      prisma.biomarker.findUnique.mockResolvedValue(bio);
      prisma.vitalRecord.findFirst.mockResolvedValue(record);
      prisma.biomarker.update.mockResolvedValue({ ...bio, value: 110, status: 'HIGH' });

      const result = await service.update('bio-1', { value: 110 }, patientActor, context);

      expect(result.value).toBe(110);
      expect(audit.log).toHaveBeenCalledWith('BIOMARKER_UPDATED', expect.any(Object));
    });

    it('lança NotFoundException para biomarcador inexistente', async () => {
      prisma.biomarker.findUnique.mockResolvedValue(null);
      await expect(
        service.update('no-id', { value: 100 }, adminActor, context),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deleta biomarcador e registra auditoria', async () => {
      const bio = makeBiomarker();
      const record = makeVitalRecord();
      prisma.biomarker.findUnique.mockResolvedValue(bio);
      prisma.vitalRecord.findFirst.mockResolvedValue(record);
      prisma.biomarker.delete.mockResolvedValue(bio);

      await service.remove('bio-1', patientActor, context);

      expect(prisma.biomarker.delete).toHaveBeenCalledWith({ where: { id: 'bio-1' } });
      expect(audit.log).toHaveBeenCalledWith('BIOMARKER_DELETED', expect.any(Object));
    });
  });
});
