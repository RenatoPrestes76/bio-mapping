import { DataNormalizerService } from '../normalizers/data-normalizer.service';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { RawMetricRecord } from '../drivers/platform-driver.interface';

const PLATFORM = HealthPlatform.SIMULATOR;

function makeRecord(overrides: Partial<RawMetricRecord>): RawMetricRecord {
  return {
    metricType: OracleMetricType.HEART_RATE,
    value: 72,
    unit: 'bpm',
    recordedAt: new Date('2025-03-01T10:00:00.500Z'),
    rawPayload: {},
    ...overrides,
  };
}

describe('DataNormalizerService', () => {
  let service: DataNormalizerService;

  beforeEach(() => {
    service = new DataNormalizerService();
  });

  it('passes through bpm unchanged', () => {
    const result = service.normalize([makeRecord({ value: 72, unit: 'bpm' })], PLATFORM);
    expect(result[0].value).toBe(72);
    expect(result[0].unit).toBe('bpm');
  });

  it('converts weight from lbs to kg', () => {
    const result = service.normalize(
      [makeRecord({ metricType: OracleMetricType.WEIGHT, value: 154, unit: 'lbs' })],
      PLATFORM,
    );
    expect(result[0].value).toBeCloseTo(69.85, 1);
    expect(result[0].unit).toBe('kg');
  });

  it('converts temperature from °F to °C', () => {
    const result = service.normalize(
      [makeRecord({ metricType: OracleMetricType.TEMPERATURE, value: 98.6, unit: '°F' })],
      PLATFORM,
    );
    expect(result[0].value).toBeCloseTo(37.0, 0);
    expect(result[0].unit).toBe('°C');
  });

  it('converts sleep from hours to minutes', () => {
    const result = service.normalize(
      [makeRecord({ metricType: OracleMetricType.SLEEP, value: 7.5, unit: 'hours' })],
      PLATFORM,
    );
    expect(result[0].value).toBe(450);
    expect(result[0].unit).toBe('minutes');
  });

  it('truncates sub-second timestamp precision', () => {
    const ts = new Date('2025-03-01T10:00:00.500Z');
    const result = service.normalize([makeRecord({ recordedAt: ts })], PLATFORM);
    expect(result[0].recordedAt.getMilliseconds()).toBe(0);
  });

  it('preserves qualifier', () => {
    const result = service.normalize(
      [makeRecord({ qualifier: 'resting' })],
      PLATFORM,
    );
    expect(result[0].qualifier).toBe('resting');
  });

  it('sets source from platform parameter', () => {
    const result = service.normalize([makeRecord({})], HealthPlatform.FITBIT);
    expect(result[0].source).toBe(HealthPlatform.FITBIT);
  });

  it('handles empty input', () => {
    expect(service.normalize([], PLATFORM)).toHaveLength(0);
  });
});
