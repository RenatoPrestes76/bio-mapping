import type { DeviceCapability, MeasurementType } from './device-capability';

export interface DeviceReadResult {
  characteristic: string;
  data: Buffer;
  timestamp: Date;
}

export interface DeviceWriteOptions {
  withResponse?: boolean;
}

export interface RawMeasurement {
  deviceId: string;
  driverName: string;
  measurementType: MeasurementType;
  rawData: Record<string, unknown>;
  unit?: string;
  timestamp: Date;
}

export interface DeviceInfo {
  driverName: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  capabilities: DeviceCapability[];
  connectionTypes: string[];
}

export interface CalibrationOptions {
  referenceValues?: Record<string, number>;
  notes?: string;
}

export interface CalibrationResult {
  success: boolean;
  calibratedAt: Date;
  notes?: string;
  referenceValues?: Record<string, number>;
}

export interface HealthCheckResult {
  healthy: boolean;
  batteryLevel?: number;
  signalStrength?: string;
  lastSeen?: Date;
  errors: string[];
}

export interface DeviceDriver {
  readonly driverName: string;
  readonly supportedConnectionTypes: string[];

  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  isConnected(deviceId: string): boolean;

  read(deviceId: string, characteristic: string): Promise<DeviceReadResult>;
  write(deviceId: string, characteristic: string, data: Buffer, opts?: DeviceWriteOptions): Promise<void>;
  subscribe(deviceId: string, characteristic: string, callback: (result: DeviceReadResult) => void): Promise<void>;
  unsubscribe(deviceId: string, characteristic: string): Promise<void>;

  takeMeasurement(deviceId: string): Promise<RawMeasurement>;
  getCapabilities(): DeviceCapability[];
  getDeviceInfo(deviceId: string): Promise<DeviceInfo>;
  calibrate(deviceId: string, opts?: CalibrationOptions): Promise<CalibrationResult>;
  healthCheck(deviceId: string): Promise<HealthCheckResult>;
}

export const DEVICE_DRIVER = Symbol('DEVICE_DRIVER');
