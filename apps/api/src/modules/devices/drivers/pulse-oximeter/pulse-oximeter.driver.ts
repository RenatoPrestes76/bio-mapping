import { Injectable } from '@nestjs/common';
import { BaseDeviceDriver } from '../base/base-device-driver';
import { DeviceCapability, MeasurementType } from '../base/device-capability';

function rand(min: number, max: number, decimals = 0) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

@Injectable()
export class PulseOximeterDriver extends BaseDeviceDriver {
  readonly driverName = 'pulse-oximeter';
  readonly supportedConnectionTypes = ['BLE'];

  constructor() {
    super(PulseOximeterDriver.name);
  }

  protected get measurementType() { return MeasurementType.PULSE_OX; }
  protected get defaultUnit() { return '%'; }

  getCapabilities(): DeviceCapability[] {
    return [
      DeviceCapability.OXYGEN_SATURATION,
      DeviceCapability.HEART_RATE,
    ];
  }

  protected simulateMeasurement(_deviceId: string): Record<string, unknown> {
    return {
      spo2: rand(94, 100),
      heartRate: rand(55, 105),
      perfusionIndex: rand(0.5, 20, 1),
    };
  }
}
