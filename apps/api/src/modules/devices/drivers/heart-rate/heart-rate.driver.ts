import { Injectable } from '@nestjs/common';
import { BaseDeviceDriver } from '../base/base-device-driver';
import { DeviceCapability, MeasurementType } from '../base/device-capability';

function rand(min: number, max: number) {
  return Math.round(Math.random() * (max - min) + min);
}

@Injectable()
export class HeartRateDriver extends BaseDeviceDriver {
  readonly driverName = 'heart-rate-monitor';
  readonly supportedConnectionTypes = ['BLE'];

  private sessionPeaks = new Map<string, number[]>();

  constructor() {
    super(HeartRateDriver.name);
  }

  protected get measurementType() { return MeasurementType.HEART_RATE; }
  protected get defaultUnit() { return 'bpm'; }

  getCapabilities(): DeviceCapability[] {
    return [
      DeviceCapability.HEART_RATE,
      DeviceCapability.CALORIES,
      DeviceCapability.STEPS,
    ];
  }

  protected simulateMeasurement(deviceId: string): Record<string, unknown> {
    const instant = rand(55, 180);
    const peaks = this.sessionPeaks.get(deviceId) ?? [];
    peaks.push(instant);
    this.sessionPeaks.set(deviceId, peaks);
    const avg = Math.round(peaks.reduce((a, b) => a + b, 0) / peaks.length);
    const max = Math.max(...peaks);
    return {
      instantHeartRate: instant,
      avgHeartRate: avg,
      maxHeartRate: max,
      rrInterval: rand(400, 1200),
    };
  }

  async disconnect(deviceId: string): Promise<void> {
    this.sessionPeaks.delete(deviceId);
    return super.disconnect(deviceId);
  }
}
