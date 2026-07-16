import { DataValidatorService } from '../validators/data-validator.service';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { NormalizedRecord } from '../normalizers/data-normalizer.service';

function makeRecord(overrides: Partial<NormalizedRecord>): NormalizedRecord {
  return {
    metricType: OracleMetricType.HEART_RATE,
    value: 72,
    unit: 'bpm',
    recordedAt: new Date('2025-03-01T10:00:00Z'),
    source: HealthPlatform.SIMULATOR,
    ...overrides,
  };
}

describe('DataValidatorService', () => {
  let service: DataValidatorService;

  beforeEach(() => {
    service = new DataValidatorService();
  });

  it('valid record returns isValid=true and no errors', () => {
    const [result] = service.validate([makeRecord({})]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('heart rate below 20 bpm is invalid', () => {
    const [result] = service.validate([makeRecord({ value: 10 })]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('physiological range');
  });

  it('heart rate above 300 bpm is invalid', () => {
    const [result] = service.validate([makeRecord({ value: 350 })]);
    expect(result.isValid).toBe(false);
  });

  it('future timestamp is invalid', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const [result] = service.validate([makeRecord({ recordedAt: future })]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('future');
  });

  it('timestamp older than 2 years is invalid', () => {
    const old = new Date('2020-01-01');
    const [result] = service.validate([makeRecord({ recordedAt: old })]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('older than 2 years');
  });

  it('SpO2 of 50% (border) is valid', () => {
    const [result] = service.validate([makeRecord({ metricType: OracleMetricType.SPO2, value: 50, unit: '%' })]);
    expect(result.isValid).toBe(true);
  });

  it('SpO2 of 101% is invalid', () => {
    const [result] = service.validate([makeRecord({ metricType: OracleMetricType.SPO2, value: 101, unit: '%' })]);
    expect(result.isValid).toBe(false);
  });

  it('buildExistingKeys creates dedup keys correctly', () => {
    const ts = new Date('2025-03-01T10:00:00Z');
    const keys = service.buildExistingKeys([
      { source: 'SIMULATOR', metricType: 'HEART_RATE', recordedAt: ts },
    ]);
    expect(keys.has(`SIMULATOR:HEART_RATE:${ts.getTime()}`)).toBe(true);
  });

  it('isDuplicateOf detects duplicate', () => {
    const ts = new Date('2025-03-01T10:00:00Z');
    const record = makeRecord({ recordedAt: ts });
    const keys = service.buildExistingKeys([
      { source: record.source, metricType: record.metricType, recordedAt: ts },
    ]);
    expect(service.isDuplicateOf(record, keys)).toBe(true);
  });

  it('isDuplicateOf returns false for new record', () => {
    const ts = new Date('2025-03-01T10:00:00Z');
    const record = makeRecord({ recordedAt: ts });
    const keys = new Set<string>();
    expect(service.isDuplicateOf(record, keys)).toBe(false);
  });
});
