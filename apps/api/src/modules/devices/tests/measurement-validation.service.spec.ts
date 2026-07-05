import { MeasurementValidationService } from '../validation/measurement-validation.service';
import { validateMeasurement, ValidationSeverity } from '../validation/physiological-limits';
import { MeasurementType } from '../drivers/base/device-capability';
import type { NormalizedMeasurement } from '../normalizers/dto/normalized-measurement.dto';

function makeNormalized(type: MeasurementType, values: Record<string, number | string | boolean>): NormalizedMeasurement {
  return { deviceId: 'dev-1', driverName: 'test', measurementType: type, values, unit: 'unit', timestamp: new Date() };
}

describe('MeasurementValidationService', () => {
  let service: MeasurementValidationService;
  beforeEach(() => { service = new MeasurementValidationService(); });

  it('valid returns true for normal blood pressure', () => {
    const result = service.validate(makeNormalized(MeasurementType.BLOOD_PRESSURE, { systolic: 120, diastolic: 80, pulse: 70 }));
    expect(result.valid).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it('valid returns false for critically high systolic (> 260)', () => {
    const result = service.validate(makeNormalized(MeasurementType.BLOOD_PRESSURE, { systolic: 270, diastolic: 80, pulse: 70 }));
    expect(result.valid).toBe(false);
    expect(result.flags[0].severity).toBe(ValidationSeverity.CRITICAL);
  });

  it('hasBlockingIssue returns true for invalid measurement', () => {
    const result = { valid: false, flags: [] };
    expect(service.hasBlockingIssue(result)).toBe(true);
  });

  it('hasBlockingIssue returns false for valid measurement', () => {
    const result = { valid: true, flags: [] };
    expect(service.hasBlockingIssue(result)).toBe(false);
  });
});

// ── validateMeasurement (unit) ────────────────────────────────────────────────

describe('validateMeasurement', () => {
  it('BODY_COMP — normal weight is valid', () => {
    const r = validateMeasurement(MeasurementType.BODY_COMP, { weight: 70, bmi: 22, bodyFat: 20 });
    expect(r.valid).toBe(true);
  });

  it('BODY_COMP — critically low weight (< 2kg) produces CRITICAL flag', () => {
    const r = validateMeasurement(MeasurementType.BODY_COMP, { weight: 1 });
    expect(r.valid).toBe(false);
    const flag = r.flags.find((f) => f.field === 'weight');
    expect(flag?.severity).toBe(ValidationSeverity.CRITICAL);
  });

  it('BLOOD_PRESSURE — diastolic 35 (between critical.min=30 and min=40) produces ERROR flag', () => {
    const r = validateMeasurement(MeasurementType.BLOOD_PRESSURE, { systolic: 120, diastolic: 35 });
    expect(r.valid).toBe(false);
    const flag = r.flags.find((f) => f.field === 'diastolic');
    expect(flag?.severity).toBe(ValidationSeverity.ERROR);
  });

  it('PULSE_OX — spo2=75 (< critical.min=80) produces CRITICAL flag', () => {
    const r = validateMeasurement(MeasurementType.PULSE_OX, { spo2: 75, heartRate: 70 });
    expect(r.valid).toBe(false);
    const flag = r.flags.find((f) => f.field === 'spo2');
    expect(flag?.severity).toBe(ValidationSeverity.CRITICAL);
  });

  it('HEART_RATE — normal values pass', () => {
    const r = validateMeasurement(MeasurementType.HEART_RATE, { instantHeartRate: 75, avgHeartRate: 72, maxHeartRate: 90 });
    expect(r.valid).toBe(true);
  });

  it('BLOOD_GLUCOSE — glucose 90 is valid', () => {
    const r = validateMeasurement(MeasurementType.BLOOD_GLUCOSE, { glucose: 90 });
    expect(r.valid).toBe(true);
  });

  it('BLOOD_GLUCOSE — glucose 650 (> critical.max=600) is critical', () => {
    const r = validateMeasurement(MeasurementType.BLOOD_GLUCOSE, { glucose: 650 });
    const flag = r.flags.find((f) => f.field === 'glucose');
    expect(flag?.severity).toBe(ValidationSeverity.CRITICAL);
  });

  it('TEMPERATURE — 41.5 (between max=41 and critical.max=42) is ERROR', () => {
    const r = validateMeasurement(MeasurementType.TEMPERATURE, { temperature: 41.5 });
    expect(r.valid).toBe(false);
    expect(r.flags[0].severity).toBe(ValidationSeverity.ERROR);
  });

  it('GENERIC — no limits, always valid', () => {
    const r = validateMeasurement(MeasurementType.GENERIC, { value: 9999 });
    expect(r.valid).toBe(true);
  });

  it('skips undefined/null fields', () => {
    const r = validateMeasurement(MeasurementType.BODY_COMP, { weight: undefined as any });
    expect(r.valid).toBe(true);
    expect(r.flags).toHaveLength(0);
  });

  it('skips non-numeric field values', () => {
    const r = validateMeasurement(MeasurementType.BODY_COMP, { weight: 'heavy' as any });
    expect(r.valid).toBe(true);
  });
});
