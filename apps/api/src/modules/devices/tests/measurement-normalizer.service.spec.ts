import { MeasurementNormalizerService } from '../normalizers/measurement-normalizer.service';
import { MeasurementType } from '../drivers/base/device-capability';
import type { RawMeasurement } from '../drivers/base/device-driver.interface';

function makeRaw(overrides: Partial<RawMeasurement> = {}): RawMeasurement {
  return {
    deviceId: 'dev-1',
    driverName: 'smart-scale',
    measurementType: MeasurementType.BODY_COMP,
    rawData: { weight: 75.5, bmi: 24.3, bodyFat: 18 },
    unit: 'kg',
    timestamp: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

describe('MeasurementNormalizerService', () => {
  let service: MeasurementNormalizerService;
  beforeEach(() => { service = new MeasurementNormalizerService(); });

  it('preserves deviceId, driverName, measurementType, timestamp', () => {
    const raw = makeRaw();
    const n = service.normalize(raw);
    expect(n.deviceId).toBe('dev-1');
    expect(n.driverName).toBe('smart-scale');
    expect(n.measurementType).toBe(MeasurementType.BODY_COMP);
    expect(n.timestamp).toEqual(new Date('2026-01-01T10:00:00Z'));
  });

  it('extracts numeric values', () => {
    const n = service.normalize(makeRaw());
    expect(n.values['weight']).toBe(75.5);
    expect(n.values['bmi']).toBe(24.3);
    expect(n.values['bodyFat']).toBe(18);
  });

  it('extracts string values', () => {
    const raw = makeRaw({ rawData: { mealTag: 'FASTING', glucose: 90 } });
    const n = service.normalize(raw);
    expect(n.values['mealTag']).toBe('FASTING');
    expect(n.values['glucose']).toBe(90);
  });

  it('extracts boolean values', () => {
    const raw = makeRaw({ rawData: { irregularPulse: true } });
    const n = service.normalize(raw);
    expect(n.values['irregularPulse']).toBe(true);
  });

  it('skips object/array/null values', () => {
    const raw = makeRaw({ rawData: { nested: { a: 1 }, arr: [1, 2], nul: null, weight: 70 } });
    const n = service.normalize(raw);
    expect(n.values['nested']).toBeUndefined();
    expect(n.values['arr']).toBeUndefined();
    expect(n.values['nul']).toBeUndefined();
    expect(n.values['weight']).toBe(70);
  });

  it('uses provided unit', () => {
    const n = service.normalize(makeRaw({ unit: 'lbs' }));
    expect(n.unit).toBe('lbs');
  });

  it.each([
    [MeasurementType.WEIGHT,         'kg'],
    [MeasurementType.BLOOD_PRESSURE, 'mmHg'],
    [MeasurementType.PULSE_OX,       '%'],
    [MeasurementType.HEART_RATE,     'bpm'],
    [MeasurementType.BLOOD_GLUCOSE,  'mg/dL'],
    [MeasurementType.TEMPERATURE,    '°C'],
    [MeasurementType.GENERIC,        'unit'],
  ])('defaults unit for %s to %s', (type, expected) => {
    const n = service.normalize(makeRaw({ measurementType: type, unit: undefined }));
    expect(n.unit).toBe(expected);
  });
});
