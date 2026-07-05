import { Injectable } from '@nestjs/common';
import { BaseDeviceDriver } from '../base/base-device-driver';
import { DeviceCapability, MeasurementType } from '../base/device-capability';

function rand(min: number, max: number, decimals = 0) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

@Injectable()
export class GlucometerDriver extends BaseDeviceDriver {
  readonly driverName = 'glucometer';
  readonly supportedConnectionTypes = ['BLE', 'USB'];

  constructor() {
    super(GlucometerDriver.name);
  }

  protected get measurementType() { return MeasurementType.BLOOD_GLUCOSE; }
  protected get defaultUnit() { return 'mg/dL'; }

  getCapabilities(): DeviceCapability[] {
    return [
      DeviceCapability.BLOOD_GLUCOSE,
    ];
  }

  protected simulateMeasurement(_deviceId: string): Record<string, unknown> {
    return {
      glucose: rand(70, 200),
      unit: 'mg/dL',
      mealTag: ['FASTING', 'BEFORE_MEAL', 'AFTER_MEAL', 'BEDTIME'][Math.floor(Math.random() * 4)],
      temperature: rand(18, 30, 1),
    };
  }
}
