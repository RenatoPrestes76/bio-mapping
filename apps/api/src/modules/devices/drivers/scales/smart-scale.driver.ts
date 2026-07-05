import { Injectable } from '@nestjs/common';
import { BaseDeviceDriver } from '../base/base-device-driver';
import { DeviceCapability, MeasurementType } from '../base/device-capability';

function rand(min: number, max: number, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

@Injectable()
export class SmartScaleDriver extends BaseDeviceDriver {
  readonly driverName = 'smart-scale';
  readonly supportedConnectionTypes = ['BLE', 'WIFI'];

  constructor() {
    super(SmartScaleDriver.name);
  }

  protected get measurementType() { return MeasurementType.BODY_COMP; }
  protected get defaultUnit() { return 'kg'; }

  getCapabilities(): DeviceCapability[] {
    return [
      DeviceCapability.WEIGHT,
      DeviceCapability.BMI,
      DeviceCapability.BODY_FAT,
      DeviceCapability.MUSCLE_MASS,
      DeviceCapability.BODY_WATER,
      DeviceCapability.VISCERAL_FAT,
      DeviceCapability.BONE_MASS,
    ];
  }

  protected simulateMeasurement(_deviceId: string): Record<string, unknown> {
    const weight = rand(50, 120);
    const height = rand(1.55, 1.95);
    const bmi = parseFloat((weight / (height * height)).toFixed(1));
    return {
      weight,
      height,
      bmi,
      bodyFat: rand(10, 35),
      muscleMass: rand(25, 60),
      bodyWater: rand(45, 65),
      visceralFat: rand(1, 20, 0),
      boneMass: rand(2, 4),
    };
  }
}
