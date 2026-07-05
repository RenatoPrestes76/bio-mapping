import { MeasurementType } from '../drivers/base/device-capability';

export enum ValidationSeverity {
  WARNING  = 'WARNING',
  ERROR    = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface ValidationFlag {
  field: string;
  value: number | string;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  flags: ValidationFlag[];
}

interface FieldLimit { min: number; max: number; critical?: { min?: number; max?: number } }

// For each field: min/max = ERROR threshold; critical.min/max = CRITICAL threshold (more extreme).
// Validation logic: check critical first (outside critical range → CRITICAL),
// then check error range (outside min/max → ERROR). Critical must be more extreme than error.
const LIMITS: Partial<Record<MeasurementType, Record<string, FieldLimit>>> = {
  [MeasurementType.WEIGHT]: {
    weight: { min: 10, max: 250, critical: { min: 2,  max: 300 } },
    bmi:    { min: 14, max: 60,  critical: { min: 10, max: 70  } },
  },
  [MeasurementType.BODY_COMP]: {
    weight:      { min: 10, max: 250, critical: { min: 2,   max: 300 } },
    bmi:         { min: 14, max: 60,  critical: { min: 10,  max: 70  } },
    bodyFat:     { min: 3,  max: 65,  critical: { min: 2,   max: 70  } },
    muscleMass:  { min: 10, max: 100 },
    bodyWater:   { min: 30, max: 80  },
    visceralFat: { min: 1,  max: 30  },
    boneMass:    { min: 0.5,max: 10  },
  },
  [MeasurementType.BLOOD_PRESSURE]: {
    systolic:  { min: 80,  max: 200, critical: { min: 60,  max: 260 } },
    diastolic: { min: 40,  max: 130, critical: { min: 30,  max: 150 } },
    pulse:     { min: 40,  max: 200, critical: { min: 30,  max: 250 } },
  },
  [MeasurementType.PULSE_OX]: {
    spo2:      { min: 88,  max: 100, critical: { min: 80 } },
    heartRate: { min: 40,  max: 200, critical: { min: 30,  max: 250 } },
  },
  [MeasurementType.HEART_RATE]: {
    instantHeartRate: { min: 40, max: 220, critical: { min: 30, max: 250 } },
    avgHeartRate:     { min: 40, max: 200, critical: { min: 30, max: 250 } },
    maxHeartRate:     { min: 40, max: 220, critical: { min: 30, max: 250 } },
  },
  [MeasurementType.BLOOD_GLUCOSE]: {
    glucose: { min: 40, max: 500, critical: { min: 20, max: 600 } },
  },
  [MeasurementType.TEMPERATURE]: {
    temperature: { min: 35, max: 41, critical: { min: 34, max: 42 } },
  },
};

export function validateMeasurement(
  measurementType: MeasurementType,
  values: Record<string, number | string | boolean>,
): ValidationResult {
  const limits = LIMITS[measurementType];
  if (!limits) return { valid: true, flags: [] };

  const flags: ValidationFlag[] = [];

  for (const [field, limit] of Object.entries(limits)) {
    const raw = values[field];
    if (raw === undefined || raw === null) continue;
    const value = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (isNaN(value)) continue;

    if (limit.critical) {
      if ((limit.critical.min !== undefined && value < limit.critical.min) ||
          (limit.critical.max !== undefined && value > limit.critical.max)) {
        flags.push({ field, value, severity: ValidationSeverity.CRITICAL, message: `${field} critically out of range: ${value}` });
        continue;
      }
    }

    if (value < limit.min || value > limit.max) {
      flags.push({ field, value, severity: ValidationSeverity.ERROR, message: `${field} out of physiological range: ${value}` });
    }
  }

  const valid = !flags.some((f) => f.severity === ValidationSeverity.CRITICAL || f.severity === ValidationSeverity.ERROR);
  return { valid, flags };
}
