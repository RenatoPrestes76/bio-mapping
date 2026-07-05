import { ClinicalMapperService } from '../mappers/clinical-mapper.service';
import { MeasurementType } from '../drivers/base/device-capability';
import type { NormalizedMeasurement } from '../normalizers/dto/normalized-measurement.dto';

const ADMIN = { sub: 'admin-1', role: 'ADMIN' };

function makeNormalized(type: MeasurementType, values: Record<string, number | string | boolean>): NormalizedMeasurement {
  return { deviceId: 'dev-1', driverName: 'test', measurementType: type, values, unit: 'unit', timestamp: new Date() };
}

function makePrisma() {
  return {
    vitalRecord: { create: jest.fn().mockResolvedValue({ id: 'vr-1' }) },
  };
}

describe('ClinicalMapperService', () => {
  let service: ClinicalMapperService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ClinicalMapperService(prisma as any);
  });

  describe('canMap', () => {
    it.each([
      MeasurementType.WEIGHT,
      MeasurementType.BODY_COMP,
      MeasurementType.BLOOD_PRESSURE,
      MeasurementType.PULSE_OX,
      MeasurementType.HEART_RATE,
      MeasurementType.BLOOD_GLUCOSE,
      MeasurementType.TEMPERATURE,
    ])('returns true for %s', (type) => {
      expect(service.canMap(type)).toBe(true);
    });

    it('returns false for ECG', () => {
      expect(service.canMap(MeasurementType.ECG)).toBe(false);
    });

    it('returns false for GENERIC', () => {
      expect(service.canMap(MeasurementType.GENERIC)).toBe(false);
    });
  });

  describe('mapToVitalRecord', () => {
    it('skips when no patientId', async () => {
      const result = await service.mapToVitalRecord(makeNormalized(MeasurementType.WEIGHT, { weight: 70 }), undefined, ADMIN);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('patientId');
      expect(prisma.vitalRecord.create).not.toHaveBeenCalled();
    });

    it('skips for unmappable type', async () => {
      const result = await service.mapToVitalRecord(makeNormalized(MeasurementType.GENERIC, { value: 1 }), 'pat-1', ADMIN);
      expect(result.skipped).toBe(true);
    });

    it('maps WEIGHT to vitalRecord', async () => {
      const n = makeNormalized(MeasurementType.WEIGHT, { weight: 75.5, bmi: 24.3 });
      const result = await service.mapToVitalRecord(n, 'pat-1', ADMIN);
      expect(result.mapped).toBe(true);
      expect(result.vitalRecordId).toBe('vr-1');
      expect(prisma.vitalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ weight: 75.5, bmi: 24.3, patientId: 'pat-1', source: 'BLUETOOTH' }),
        }),
      );
    });

    it('maps BODY_COMP including bodyFatPercentage and leanMass', async () => {
      const n = makeNormalized(MeasurementType.BODY_COMP, { weight: 80, bmi: 26, bodyFat: 22, muscleMass: 40 });
      await service.mapToVitalRecord(n, 'pat-1', ADMIN);
      expect(prisma.vitalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bodyFatPercentage: 22, leanMass: 40 }),
        }),
      );
    });

    it('maps BLOOD_PRESSURE to systolic/diastolic/heartRate', async () => {
      const n = makeNormalized(MeasurementType.BLOOD_PRESSURE, { systolic: 120, diastolic: 80, pulse: 70 });
      await service.mapToVitalRecord(n, 'pat-1', ADMIN);
      expect(prisma.vitalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bloodPressureSystolic: 120, bloodPressureDiastolic: 80, heartRate: 70 }),
        }),
      );
    });

    it('maps PULSE_OX to oxygenSaturation', async () => {
      const n = makeNormalized(MeasurementType.PULSE_OX, { spo2: 98, heartRate: 72 });
      await service.mapToVitalRecord(n, 'pat-1', ADMIN);
      expect(prisma.vitalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ oxygenSaturation: 98 }),
        }),
      );
    });

    it('maps HEART_RATE to heartRate', async () => {
      const n = makeNormalized(MeasurementType.HEART_RATE, { instantHeartRate: 80 });
      await service.mapToVitalRecord(n, 'pat-1', ADMIN);
      expect(prisma.vitalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ heartRate: 80 }),
        }),
      );
    });

    it('maps BLOOD_GLUCOSE to bloodGlucose', async () => {
      const n = makeNormalized(MeasurementType.BLOOD_GLUCOSE, { glucose: 95 });
      await service.mapToVitalRecord(n, 'pat-1', ADMIN);
      expect(prisma.vitalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bloodGlucose: 95 }),
        }),
      );
    });

    it('maps TEMPERATURE to bodyTemperature', async () => {
      const n = makeNormalized(MeasurementType.TEMPERATURE, { temperature: 36.5 });
      await service.mapToVitalRecord(n, 'pat-1', ADMIN);
      expect(prisma.vitalRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bodyTemperature: 36.5 }),
        }),
      );
    });

    it('skips when no mappable fields present', async () => {
      const n = makeNormalized(MeasurementType.WEIGHT, { someOtherField: 'foo' });
      const result = await service.mapToVitalRecord(n, 'pat-1', ADMIN);
      expect(result.skipped).toBe(true);
      expect(prisma.vitalRecord.create).not.toHaveBeenCalled();
    });
  });
});
