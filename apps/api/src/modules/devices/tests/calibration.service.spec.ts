import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CalibrationService } from '../calibration/calibration.service';

const CTX = { ip: '127.0.0.1', userAgent: 'test' };
const ADMIN = { sub: 'admin-1', role: 'ADMIN' };
const PROFESSIONAL = { sub: 'prof-1', role: 'PROFESSIONAL' };
const PATIENT = { sub: 'pat-1', role: 'PATIENT' };

function makeCalibration(overrides: any = {}) {
  return {
    id: 'cal-1',
    deviceId: 'dev-1',
    calibratedBy: 'admin-1',
    calibratedAt: new Date(),
    expiresAt: null,
    notes: null,
    referenceValues: null,
    isValid: true,
    createdAt: new Date(),
    ...overrides,
  };
}

function makePrisma() {
  return {
    device: { findFirst: jest.fn() },
    deviceCalibration: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

function makeAudit() { return { log: jest.fn().mockResolvedValue(undefined) }; }

describe('CalibrationService', () => {
  let service: CalibrationService;
  let prisma: ReturnType<typeof makePrisma>;
  let audit: ReturnType<typeof makeAudit>;

  beforeEach(() => {
    prisma = makePrisma();
    audit = makeAudit();
    service = new CalibrationService(prisma as any, audit as any);
  });

  describe('create', () => {
    it('creates calibration and logs audit', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'dev-1' });
      prisma.deviceCalibration.create.mockResolvedValue(makeCalibration());

      const result = await service.create('dev-1', { notes: 'bench test' }, ADMIN, CTX);

      expect(prisma.deviceCalibration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ deviceId: 'dev-1', calibratedBy: ADMIN.sub }),
      });
      expect(audit.log).toHaveBeenCalledWith('CALIBRATION_CREATED', expect.anything());
      expect(result.isValid).toBe(true);
    });

    it('PATIENT throws ForbiddenException', async () => {
      await expect(service.create('dev-1', {}, PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if device not found', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      await expect(service.create('dev-1', {}, ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('PROFESSIONAL can create calibration', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'dev-1' });
      prisma.deviceCalibration.create.mockResolvedValue(makeCalibration());
      await expect(service.create('dev-1', {}, PROFESSIONAL, CTX)).resolves.toBeDefined();
    });

    it('parses expiresAt string to Date', async () => {
      prisma.device.findFirst.mockResolvedValue({ id: 'dev-1' });
      prisma.deviceCalibration.create.mockResolvedValue(makeCalibration({ expiresAt: new Date('2027-01-01') }));
      const result = await service.create('dev-1', { expiresAt: '2027-01-01T00:00:00.000Z' }, ADMIN, CTX);
      expect(result.expiresAt).not.toBeNull();
    });
  });

  describe('findByDevice', () => {
    it('returns list of calibrations', async () => {
      prisma.deviceCalibration.findMany.mockResolvedValue([makeCalibration(), makeCalibration({ id: 'cal-2' })]);
      const result = await service.findByDevice('dev-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getLatest', () => {
    it('returns latest valid calibration', async () => {
      prisma.deviceCalibration.findFirst.mockResolvedValue(makeCalibration());
      const result = await service.getLatest('dev-1');
      expect(result?.id).toBe('cal-1');
    });

    it('returns null when no calibration', async () => {
      prisma.deviceCalibration.findFirst.mockResolvedValue(null);
      const result = await service.getLatest('dev-1');
      expect(result).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('sets isValid to false and logs audit', async () => {
      prisma.deviceCalibration.update.mockResolvedValue(makeCalibration({ isValid: false }));
      await service.invalidate('cal-1', ADMIN, CTX);
      expect(prisma.deviceCalibration.update).toHaveBeenCalledWith({
        where: { id: 'cal-1' },
        data: { isValid: false },
      });
      expect(audit.log).toHaveBeenCalledWith('CALIBRATION_EXPIRED', expect.anything());
    });

    it('PATIENT throws ForbiddenException', async () => {
      await expect(service.invalidate('cal-1', PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('isExpired', () => {
    it('returns false when no calibration', async () => {
      jest.spyOn(service, 'getLatest').mockResolvedValue(null);
      expect(await service.isExpired('dev-1')).toBe(false);
    });

    it('returns false when no expiresAt', async () => {
      jest.spyOn(service, 'getLatest').mockResolvedValue({ ...makeCalibration(), expiresAt: null } as any);
      expect(await service.isExpired('dev-1')).toBe(false);
    });

    it('returns true when expiresAt is in the past', async () => {
      jest.spyOn(service, 'getLatest').mockResolvedValue({ expiresAt: new Date('2020-01-01') } as any);
      expect(await service.isExpired('dev-1')).toBe(true);
    });

    it('returns false when expiresAt is in the future', async () => {
      jest.spyOn(service, 'getLatest').mockResolvedValue({ expiresAt: new Date('2099-01-01') } as any);
      expect(await service.isExpired('dev-1')).toBe(false);
    });
  });
});
