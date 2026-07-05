import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IngestionPipelineService } from '../ingestion/ingestion-pipeline.service';
import { MeasurementStatus } from '@bio/database';
import { MeasurementType } from '../drivers/base/device-capability';
import type { RawMeasurement } from '../drivers/base/device-driver.interface';

const CTX = { ip: '127.0.0.1', userAgent: 'test' };
const ADMIN = { sub: 'admin-1', role: 'ADMIN' };
const PROFESSIONAL = { sub: 'prof-1', role: 'PROFESSIONAL' };
const PATIENT = { sub: 'pat-1', role: 'PATIENT' };

function makeRaw(overrides: Partial<RawMeasurement> = {}): RawMeasurement {
  return {
    deviceId: 'dev-1',
    driverName: 'blood-pressure-monitor',
    measurementType: MeasurementType.BLOOD_PRESSURE,
    rawData: { systolic: 120, diastolic: 80, pulse: 70 },
    unit: 'mmHg',
    timestamp: new Date(),
    ...overrides,
  };
}

function makeDevice(overrides: any = {}) {
  return { id: 'dev-1', patientId: 'pat-1', organizationId: 'org-1', deletedAt: null, ...overrides };
}

function makePrisma() {
  return {
    device: { findFirst: jest.fn() },
    deviceMeasurement: {
      create: jest.fn().mockResolvedValue({ id: 'meas-1' }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn(),
  };
}

function makeNormalizer() {
  return {
    normalize: jest.fn().mockImplementation((raw: RawMeasurement) => ({
      deviceId: raw.deviceId,
      driverName: raw.driverName,
      measurementType: raw.measurementType,
      values: { systolic: 120, diastolic: 80, pulse: 70 },
      unit: 'mmHg',
      timestamp: raw.timestamp,
    })),
  };
}

function makeValidator(valid = true) {
  return {
    validate: jest.fn().mockReturnValue({ valid, flags: valid ? [] : [{ field: 'systolic', value: 250, severity: 'CRITICAL', message: 'err' }] }),
    hasBlockingIssue: jest.fn().mockReturnValue(!valid),
  };
}

function makeMapper(vitalRecordId: string | null = 'vr-1') {
  return {
    canMap: jest.fn().mockReturnValue(true),
    mapToVitalRecord: jest.fn().mockResolvedValue({ vitalRecordId, mapped: vitalRecordId !== null, skipped: vitalRecordId === null }),
  };
}

function makeEventBus() {
  return { emit: jest.fn(), on: jest.fn(), off: jest.fn() };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeService(overrides: { validator?: any; mapper?: any } = {}) {
  const prisma = makePrisma();
  const audit = makeAudit();
  const eventBus = makeEventBus();
  const normalizer = makeNormalizer();
  const validator = overrides.validator ?? makeValidator();
  const mapper = overrides.mapper ?? makeMapper();
  const service = new IngestionPipelineService(
    prisma as any, audit as any, eventBus as any, normalizer as any, validator as any, mapper as any,
  );
  return { service, prisma, audit, eventBus, normalizer, validator, mapper };
}

describe('IngestionPipelineService', () => {
  describe('ingest', () => {
    it('full happy path: VALIDATED + PROCESSED + vitalRecord created', async () => {
      const { service, prisma, audit, eventBus } = makeService();
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.deviceMeasurement.create.mockResolvedValue({ id: 'meas-1' });

      const result = await service.ingest(makeRaw(), ADMIN, CTX);

      expect(result.measurementId).toBe('meas-1');
      expect(result.status).toBe(MeasurementStatus.PROCESSED);
      expect(result.vitalRecordId).toBe('vr-1');
      expect(audit.log).toHaveBeenCalledWith('MEASUREMENT_PROCESSED', expect.anything());
      expect(eventBus.emit).toHaveBeenCalledWith('measurement.received', expect.anything());
      expect(eventBus.emit).toHaveBeenCalledWith('measurement.validated', expect.anything());
    });

    it('rejected measurement: REJECTED status, emits MEASUREMENT_REJECTED', async () => {
      const { service, prisma, audit, eventBus } = makeService({ validator: makeValidator(false) });
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.deviceMeasurement.create.mockResolvedValue({ id: 'meas-2' });

      const result = await service.ingest(makeRaw(), ADMIN, CTX);

      expect(result.status).toBe(MeasurementStatus.REJECTED);
      expect(result.vitalRecordId).toBeNull();
      expect(audit.log).toHaveBeenCalledWith('MEASUREMENT_REJECTED', expect.anything());
      expect(eventBus.emit).toHaveBeenCalledWith('measurement.rejected', expect.anything());
    });

    it('PATIENT throws ForbiddenException', async () => {
      const { service } = makeService();
      await expect(service.ingest(makeRaw(), PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when device not found', async () => {
      const { service, prisma } = makeService();
      prisma.device.findFirst.mockResolvedValue(null);
      await expect(service.ingest(makeRaw(), ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('PROFESSIONAL can ingest', async () => {
      const { service, prisma } = makeService();
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.deviceMeasurement.create.mockResolvedValue({ id: 'meas-3' });
      await expect(service.ingest(makeRaw(), PROFESSIONAL, CTX)).resolves.toBeDefined();
    });

    it('validated measurement without vitalRecord stays VALIDATED', async () => {
      const { service, prisma } = makeService({ mapper: makeMapper(null) });
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.deviceMeasurement.create.mockResolvedValue({ id: 'meas-4' });

      const result = await service.ingest(makeRaw(), ADMIN, CTX);
      expect(result.status).toBe(MeasurementStatus.VALIDATED);
      expect(result.vitalRecordId).toBeNull();
    });

    it('persists measurement with correct data', async () => {
      const { service, prisma } = makeService();
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.deviceMeasurement.create.mockResolvedValue({ id: 'meas-5' });

      await service.ingest(makeRaw(), ADMIN, CTX);

      expect(prisma.deviceMeasurement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceId: 'dev-1',
          driverName: 'blood-pressure-monitor',
          measurementType: MeasurementType.BLOOD_PRESSURE,
        }),
      });
    });
  });

  describe('getMeasurements', () => {
    it('returns paginated list', async () => {
      const { service, prisma } = makeService();
      prisma.$transaction.mockResolvedValue([[], 0]);
      const result = await service.getMeasurements('dev-1', 1, 20);
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });
});
