import { Logger } from '@nestjs/common';
import type { DeviceCapability, MeasurementType } from './device-capability';
import type {
  DeviceDriver,
  DeviceReadResult,
  DeviceWriteOptions,
  RawMeasurement,
  DeviceInfo,
  CalibrationOptions,
  CalibrationResult,
  HealthCheckResult,
} from './device-driver.interface';

export abstract class BaseDeviceDriver implements DeviceDriver {
  protected readonly logger: Logger;
  private readonly connections = new Map<string, boolean>();

  constructor(name: string) {
    this.logger = new Logger(name);
  }

  abstract readonly driverName: string;
  abstract readonly supportedConnectionTypes: string[];
  abstract getCapabilities(): DeviceCapability[];

  protected abstract simulateMeasurement(deviceId: string): Record<string, unknown>;
  protected abstract get measurementType(): MeasurementType;
  protected abstract get defaultUnit(): string;

  async connect(deviceId: string): Promise<void> {
    this.connections.set(deviceId, true);
    this.logger.log(`Connected to device ${deviceId}`);
  }

  async disconnect(deviceId: string): Promise<void> {
    this.connections.delete(deviceId);
    this.logger.log(`Disconnected from device ${deviceId}`);
  }

  isConnected(deviceId: string): boolean {
    return this.connections.get(deviceId) === true;
  }

  async read(deviceId: string, characteristic: string): Promise<DeviceReadResult> {
    return {
      characteristic,
      data: Buffer.alloc(0),
      timestamp: new Date(),
    };
  }

  async write(_deviceId: string, _characteristic: string, _data: Buffer, _opts?: DeviceWriteOptions): Promise<void> {
    // Mock: no-op
  }

  async subscribe(_deviceId: string, _characteristic: string, _callback: (result: DeviceReadResult) => void): Promise<void> {
    // Mock: no-op
  }

  async unsubscribe(_deviceId: string, _characteristic: string): Promise<void> {
    // Mock: no-op
  }

  async takeMeasurement(deviceId: string): Promise<RawMeasurement> {
    const rawData = this.simulateMeasurement(deviceId);
    return {
      deviceId,
      driverName: this.driverName,
      measurementType: this.measurementType,
      rawData,
      unit: this.defaultUnit,
      timestamp: new Date(),
    };
  }

  async getDeviceInfo(deviceId: string): Promise<DeviceInfo> {
    return {
      driverName: this.driverName,
      capabilities: this.getCapabilities(),
      connectionTypes: this.supportedConnectionTypes,
    };
  }

  async calibrate(_deviceId: string, opts?: CalibrationOptions): Promise<CalibrationResult> {
    return {
      success: true,
      calibratedAt: new Date(),
      notes: opts?.notes,
      referenceValues: opts?.referenceValues,
    };
  }

  async healthCheck(deviceId: string): Promise<HealthCheckResult> {
    return {
      healthy: this.isConnected(deviceId),
      errors: this.isConnected(deviceId) ? [] : [`Device ${deviceId} not connected`],
    };
  }
}
