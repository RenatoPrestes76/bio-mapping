export interface DeviceReadResult {
  characteristic: string;
  data: Buffer;
  timestamp: Date;
}

export interface DeviceWriteOptions {
  withResponse?: boolean;
}

// Contract for all device drivers. No driver may access BLE/USB/etc. directly —
// all must go through this interface, which BleManagerService implements as the
// single gateway.
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
}

export const DEVICE_DRIVER = Symbol('DEVICE_DRIVER');
