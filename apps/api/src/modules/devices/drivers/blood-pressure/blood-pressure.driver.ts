import { Injectable } from '@nestjs/common';
import { BaseDeviceDriver } from '../base/base-device-driver';
import { DeviceCapability, MeasurementType } from '../base/device-capability';

function rand(min: number, max: number) {
  return Math.round(Math.random() * (max - min) + min);
}

@Injectable()
export class BloodPressureDriver extends BaseDeviceDriver {
  readonly driverName = 'blood-pressure-monitor';
  readonly supportedConnectionTypes = ['BLE'];

  constructor() {
    super(BloodPressureDriver.name);
  }

  protected get measurementType() { return MeasurementType.BLOOD_PRESSURE; }
  protected get defaultUnit() { return 'mmHg'; }

  getCapabilities(): DeviceCapability[] {
    return [
      DeviceCapability.BLOOD_PRESSURE,
      DeviceCapability.HEART_RATE,
    ];
  }

  protected simulateMeasurement(_deviceId: string): Record<string, unknown> {
    return {
      systolic: rand(100, 160),
      diastolic: rand(60, 100),
      pulse: rand(55, 100),
      irregularPulse: Math.random() < 0.05,
    };
  }
}
