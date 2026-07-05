import { Injectable } from '@nestjs/common';
import { BaseDeviceDriver } from '../base/base-device-driver';
import { DeviceCapability, MeasurementType } from '../base/device-capability';

// Generic mock driver — simulates any measurement type for testing and demos.
@Injectable()
export class MockDriver extends BaseDeviceDriver {
  readonly driverName = 'mock-driver';
  readonly supportedConnectionTypes = ['BLE', 'USB', 'WIFI', 'API'];

  constructor() {
    super(MockDriver.name);
  }

  protected get measurementType() { return MeasurementType.GENERIC; }
  protected get defaultUnit() { return 'unit'; }

  getCapabilities(): DeviceCapability[] {
    return Object.values(DeviceCapability);
  }

  protected simulateMeasurement(_deviceId: string): Record<string, unknown> {
    return {
      value: parseFloat((Math.random() * 100).toFixed(2)),
      raw: Buffer.from([0x01, 0x02, 0x03]).toString('hex'),
      simulated: true,
    };
  }
}
