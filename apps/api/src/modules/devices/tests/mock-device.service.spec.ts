import { NotFoundException } from '@nestjs/common';
import { MockDeviceService } from '../drivers/mock/mock-device.service';
import { MeasurementType } from '../drivers/base/device-capability';

const CTX = { ip: '127.0.0.1', userAgent: 'test' };
const ADMIN = { sub: 'admin-1', role: 'ADMIN' };

function makePipeline() {
  return {
    ingest: jest.fn().mockResolvedValue({ measurementId: 'meas-1', status: 'VALIDATED', vitalRecordId: null }),
  };
}

describe('MockDeviceService', () => {
  let service: MockDeviceService;
  let pipeline: ReturnType<typeof makePipeline>;

  beforeEach(() => {
    pipeline = makePipeline();
    service = new MockDeviceService(pipeline as any);
  });

  describe('listDrivers', () => {
    it('returns all driver names', () => {
      const drivers = service.listDrivers();
      expect(drivers).toContain('smart-scale');
      expect(drivers).toContain('blood-pressure-monitor');
      expect(drivers).toContain('pulse-oximeter');
      expect(drivers).toContain('heart-rate-monitor');
      expect(drivers).toContain('glucometer');
      expect(drivers).toContain('mock-driver');
    });
  });

  describe('start', () => {
    it('creates a simulation session', () => {
      const session = service.start('dev-1', 'smart-scale');
      expect(session.deviceId).toBe('dev-1');
      expect(session.driverName).toBe('smart-scale');
      expect(session.active).toBe(true);
      expect(session.measurementsSent).toBe(0);
    });

    it('throws NotFoundException for unknown driver', () => {
      expect(() => service.start('dev-1', 'unknown-driver')).toThrow(NotFoundException);
    });

    it('assigns unique session ids', () => {
      const s1 = service.start('dev-1', 'mock-driver');
      const s2 = service.start('dev-2', 'mock-driver');
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('stop', () => {
    it('marks session inactive', () => {
      const s = service.start('dev-1', 'mock-driver');
      const stopped = service.stop(s.id);
      expect(stopped.active).toBe(false);
    });

    it('throws NotFoundException for unknown session', () => {
      expect(() => service.stop('unknown-session')).toThrow(NotFoundException);
    });
  });

  describe('send', () => {
    it('sends measurement through pipeline and returns result', async () => {
      const result = await service.send({ deviceId: 'dev-1', driverName: 'mock-driver' }, ADMIN, CTX);
      expect(pipeline.ingest).toHaveBeenCalled();
      expect(result.measurementId).toBe('meas-1');
    });

    it('increments measurementsSent for active session', async () => {
      const s = service.start('dev-1', 'mock-driver');
      await service.send({ deviceId: 'dev-1', driverName: 'mock-driver' }, ADMIN, CTX);
      const sessions = service.getAllSessions();
      expect(sessions.find((x) => x.id === s.id)!.measurementsSent).toBe(1);
    });

    it('uses custom values when provided', async () => {
      await service.send({
        deviceId: 'dev-1',
        driverName: 'mock-driver',
        measurementType: MeasurementType.BLOOD_GLUCOSE,
        values: { glucose: 95 },
      }, ADMIN, CTX);
      const raw = pipeline.ingest.mock.calls[0][0];
      expect(raw.rawData['glucose']).toBe(95);
      expect(raw.measurementType).toBe(MeasurementType.BLOOD_GLUCOSE);
    });

    it('uses auto-generated measurement when no values provided', async () => {
      await service.send({ deviceId: 'dev-1', driverName: 'blood-pressure-monitor' }, ADMIN, CTX);
      const raw = pipeline.ingest.mock.calls[0][0];
      expect(raw.rawData['systolic']).toBeDefined();
    });

    it('falls back to MockDriver for unknown driverName', async () => {
      await service.send({ deviceId: 'dev-1', driverName: 'unknown-xyz' }, ADMIN, CTX);
      const raw = pipeline.ingest.mock.calls[0][0];
      expect(raw.rawData['simulated']).toBe(true);
    });
  });

  describe('getActiveSessions / getAllSessions', () => {
    it('getActiveSessions returns only active', () => {
      const s1 = service.start('dev-1', 'mock-driver');
      const s2 = service.start('dev-2', 'mock-driver');
      service.stop(s1.id);
      const active = service.getActiveSessions();
      expect(active.find((s) => s.id === s1.id)).toBeUndefined();
      expect(active.find((s) => s.id === s2.id)).toBeDefined();
    });

    it('getAllSessions returns all including stopped', () => {
      const s1 = service.start('dev-1', 'mock-driver');
      service.stop(s1.id);
      expect(service.getAllSessions()).toHaveLength(1);
    });
  });
});
