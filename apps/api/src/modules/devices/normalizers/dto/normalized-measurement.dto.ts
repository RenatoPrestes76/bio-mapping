import type { MeasurementType } from '../../drivers/base/device-capability';

export interface NormalizedMeasurement {
  deviceId: string;
  driverName: string;
  measurementType: MeasurementType;
  values: Record<string, number | string | boolean>;
  unit: string;
  timestamp: Date;
}
