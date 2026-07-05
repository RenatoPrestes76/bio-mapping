import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { VitalsService } from '../services/vitals.service';
import { VitalsRepository } from '../repositories/vitals.repository';
import { VitalCalculationsService } from '../services/vital-calculations.service';
import { AuditLogService } from '../../../common/audit/audit-log.service';
import { PrismaService } from '../../../database/prisma.service';

const makeRecord = (overrides = {}) => ({
  id: 'vital-1',
  patientId: 'patient-1',
  professionalId: null,
  organizationId: null,
  recordedAt: new Date('2025-06-01T08:00:00Z'),
  source: 'MANUAL',
  status: 'DRAFT',
  notes: null,
  height: 175,
  weight: 80,
  bmi: 26.12,
  bodyFatPercentage: null,
  leanMass: null,
  fatMass: null,
  visceralFat: null,
  waistCircumference: null,
  hipCircumference: null,
  neckCircumference: null,
  chestCircumference: null,
  armCircumference: null,
  thighCircumference: null,
  calfCircumference: null,
  heartRate: 72,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  respiratoryRate: null,
  bodyTemperature: null,
  oxygenSaturation: null,
  bloodGlucose: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  biomarkers: [],
  history: [],
  ...overrides,
});

const makePatient = (overrides = {}) => ({
  id: 'patient-1',
  userId: 'user-patient',
  primaryProfessionalId: null,
  deletedAt: null,
  ...overrides,
});

describe('VitalsService', () => {
  let service: VitalsService;
  let repo: jest.Mocked<VitalsRepository>;
  let prisma: any;
  let audit: jest.Mocked<AuditLogService>;

  const patientActor = { sub: 'user-patient', role: 'PATIENT' };
  const adminActor = { sub: 'user-admin', role: 'ADMIN' };
  const professionalActor = { sub: 'user-prof', role: 'PROFESSIONAL' };
  const context = { ip: '127.0.0.1', userAgent: 'jest' };

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockPrisma = {
      patient: { findFirst: jest.fn() },
      professional: { findFirst: jest.fn() },
      membership: { findFirst: jest.fn() },
    };

    const mockAudit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VitalsService,
        VitalCalculationsService,
        { provide: VitalsRepository, useValue: mockRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(VitalsService);
    repo = module.get(VitalsRepository);
    prisma = module.get(PrismaService);
    audit = module.get(AuditLogService);
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('cria registro e calcula BMI automaticamente', async () => {
      const patient = makePatient();
      const record = makeRecord();
      prisma.patient.findFirst.mockResolvedValue(patient);
      repo.create.mockResolvedValue(record);

      const result = await service.create(
        'patient-1',
        { recordedAt: '2025-06-01T08:00:00Z', height: 175, weight: 80 },
        patientActor,
        context,
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ bmi: 26.12 }),
      );
      expect(result.bmi).toBe(26.12);
      expect(audit.log).toHaveBeenCalledWith('VITAL_CREATED', expect.any(Object));
    });

    it('lança NotFoundException se paciente não existir', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.create('no-patient', { recordedAt: '2025-06-01T08:00:00Z' }, adminActor, context),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException se paciente tentar criar registro de outro paciente', async () => {
      const patient = makePatient({ userId: 'other-user' });
      prisma.patient.findFirst.mockResolvedValue(patient);
      await expect(
        service.create('patient-1', { recordedAt: '2025-06-01T08:00:00Z' }, patientActor, context),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin pode criar para qualquer paciente', async () => {
      const patient = makePatient({ userId: 'other-user' });
      const record = makeRecord();
      prisma.patient.findFirst.mockResolvedValue(patient);
      repo.create.mockResolvedValue(record);

      await expect(
        service.create('patient-1', { recordedAt: '2025-06-01T08:00:00Z' }, adminActor, context),
      ).resolves.toBeDefined();
    });

    it('não calcula BMI quando peso ou altura não são fornecidos', async () => {
      const patient = makePatient();
      const record = makeRecord({ height: null, weight: null, bmi: null });
      prisma.patient.findFirst.mockResolvedValue(patient);
      repo.create.mockResolvedValue(record);

      await service.create(
        'patient-1',
        { recordedAt: '2025-06-01T08:00:00Z', heartRate: 72 },
        patientActor,
        context,
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ bmi: undefined }),
      );
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna lista paginada de registros do paciente', async () => {
      const patient = makePatient();
      const record = makeRecord();
      prisma.patient.findFirst.mockResolvedValue(patient);
      repo.findAll.mockResolvedValue([[record], 1]);

      const result = await service.findAll('patient-1', { page: 1, limit: 20 }, patientActor);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('nega acesso de paciente a registros de outro', async () => {
      const patient = makePatient({ userId: 'other-user' });
      prisma.patient.findFirst.mockResolvedValue(patient);
      await expect(
        service.findAll('patient-1', {}, patientActor),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna registro com indicadores calculados', async () => {
      const record = makeRecord();
      const patient = makePatient();
      repo.findById.mockResolvedValue(record as any);
      prisma.patient.findFirst.mockResolvedValue(patient);

      const result = await service.findOne('vital-1', patientActor);

      expect(result.id).toBe('vital-1');
      expect(result.bmiClassification).toBe('Sobrepeso');
      expect(result.bloodPressureClassification).toBe('Elevada');
    });

    it('lança NotFoundException para registro inexistente', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('no-id', adminActor)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('gera entradas no histórico para campos alterados', async () => {
      const record = makeRecord();
      const patient = makePatient();
      const updated = makeRecord({ weight: 82, bmi: 26.77 });
      repo.findById.mockResolvedValue(record as any);
      prisma.patient.findFirst.mockResolvedValue(patient);
      repo.update.mockResolvedValue(updated as any);

      await service.update('vital-1', { weight: 82 }, patientActor, context);

      expect(repo.update).toHaveBeenCalledWith(
        'vital-1',
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({ field: 'weight', previousValue: '80', newValue: '82' }),
        ]),
      );
    });

    it('recalcula BMI quando peso é alterado', async () => {
      const record = makeRecord();
      const patient = makePatient();
      repo.findById.mockResolvedValue(record as any);
      prisma.patient.findFirst.mockResolvedValue(patient);
      repo.update.mockResolvedValue(record as any);

      await service.update('vital-1', { weight: 90 }, patientActor, context);

      expect(repo.update).toHaveBeenCalledWith(
        'vital-1',
        expect.objectContaining({ bmi: 29.39 }),
        expect.any(Array),
      );
    });

    it('impede edição de registro arquivado', async () => {
      const record = makeRecord({ status: 'ARCHIVED' });
      const patient = makePatient();
      repo.findById.mockResolvedValue(record as any);
      prisma.patient.findFirst.mockResolvedValue(patient);

      await expect(
        service.update('vital-1', { weight: 82 }, patientActor, context),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('não gera histórico quando valor não muda', async () => {
      const record = makeRecord({ weight: 80 });
      const patient = makePatient();
      repo.findById.mockResolvedValue(record as any);
      prisma.patient.findFirst.mockResolvedValue(patient);
      repo.update.mockResolvedValue(record as any);

      await service.update('vital-1', { weight: 80 }, patientActor, context);

      expect(repo.update).toHaveBeenCalledWith('vital-1', expect.any(Object), []);
    });
  });

  // ── validate ─────────────────────────────────────────────────────────────

  describe('validate', () => {
    it('profissional pode validar registro DRAFT', async () => {
      const record = makeRecord({ status: 'DRAFT' });
      const validated = makeRecord({ status: 'VALIDATED' });
      repo.findById.mockResolvedValue(record as any);
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      repo.update.mockResolvedValue(validated as any);

      const result = await service.validate('vital-1', professionalActor, context);
      expect(audit.log).toHaveBeenCalledWith('VITAL_VALIDATED', expect.any(Object));
      expect(result.status).toBe('VALIDATED');
    });

    it('paciente não pode validar registro', async () => {
      const record = makeRecord();
      repo.findById.mockResolvedValue(record as any);
      await expect(service.validate('vital-1', patientActor, context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lança erro ao tentar re-validar registro já validado', async () => {
      const record = makeRecord({ status: 'VALIDATED' });
      repo.findById.mockResolvedValue(record as any);
      await expect(service.validate('vital-1', professionalActor, context)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('realiza soft delete e registra auditoria', async () => {
      const record = makeRecord();
      const patient = makePatient();
      repo.findById.mockResolvedValue(record as any);
      prisma.patient.findFirst.mockResolvedValue(patient);
      repo.softDelete.mockResolvedValue(undefined as any);

      await service.remove('vital-1', patientActor, context);

      expect(repo.softDelete).toHaveBeenCalledWith('vital-1');
      expect(audit.log).toHaveBeenCalledWith('VITAL_DELETED', expect.any(Object));
    });
  });
});
