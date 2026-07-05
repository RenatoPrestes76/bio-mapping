import { Injectable } from '@nestjs/common';
import { MeasurementType } from '../drivers/base/device-capability';
import type { RawMeasurement } from '../drivers/base/device-driver.interface';
import type { NormalizedMeasurement } from './dto/normalized-measurement.dto';

@Injectable()
export class MeasurementNormalizerService {
  normalize(raw: RawMeasurement): NormalizedMeasurement {
    return {
      deviceId: raw.deviceId,
      driverName: raw.driverName,
      measurementType: raw.measurementType,
      values: this.extractValues(raw),
      unit: raw.unit ?? this.defaultUnit(raw.measurementType),
      timestamp: raw.timestamp,
    };
  }

  private extractValues(raw: RawMeasurement): Record<string, number | string | boolean> {
    const result: Record<string, number | string | boolean> = {};
    for (const [key, val] of Object.entries(raw.rawData)) {
      if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
        result[key] = val;
      }
    }
    return result;
  }

  private defaultUnit(type: MeasurementType): string {
    const units: Partial<Record<MeasurementType, string>> = {
      [MeasurementType.WEIGHT]:         'kg',
      [MeasurementType.BODY_COMP]:      'kg',
      [MeasurementType.BLOOD_PRESSURE]: 'mmHg',
      [MeasurementType.PULSE_OX]:       '%',
      [MeasurementType.HEART_RATE]:     'bpm',
      [MeasurementType.BLOOD_GLUCOSE]:  'mg/dL',
      [MeasurementType.TEMPERATURE]:    '°C',
    };
    return units[type] ?? 'unit';
  }
}
