export enum DeviceEventType {
  DEVICE_CONNECTED       = 'device.connected',
  DEVICE_DISCONNECTED    = 'device.disconnected',
  DEVICE_DISCOVERED      = 'device.discovered',
  DEVICE_LOST            = 'device.lost',
  DEVICE_BATTERY_CHANGED = 'device.battery_changed',
  DEVICE_ERROR           = 'device.error',
  // Sprint 7 — ORACLE
  MEASUREMENT_RECEIVED   = 'measurement.received',
  MEASUREMENT_VALIDATED  = 'measurement.validated',
  MEASUREMENT_REJECTED   = 'measurement.rejected',
  CALIBRATION_EXPIRED    = 'calibration.expired',
  BATTERY_LOW            = 'device.battery_low',
}

export interface DeviceConnectedEvent {
  deviceId: string;
  sessionId: string;
  timestamp: Date;
}

export interface DeviceDisconnectedEvent {
  deviceId: string;
  sessionId?: string;
  reason?: string;
  timestamp: Date;
}

export interface DeviceDiscoveredEvent {
  macAddress: string;
  name: string;
  rssi?: number;
  manufacturer?: string;
  connectionType: string;
  timestamp: Date;
}

export interface DeviceLostEvent {
  macAddress: string;
  deviceId?: string;
  timestamp: Date;
}

export interface DeviceBatteryChangedEvent {
  deviceId: string;
  batteryLevel: number;
  timestamp: Date;
}

export interface DeviceErrorEvent {
  deviceId: string;
  error: string;
  timestamp: Date;
}

export interface MeasurementReceivedEvent {
  measurementId: string;
  deviceId: string;
  measurementType: string;
  timestamp: Date;
}

export interface MeasurementValidatedEvent {
  measurementId: string;
  deviceId: string;
  vitalRecordId: string | null;
  timestamp: Date;
}

export interface MeasurementRejectedEvent {
  measurementId: string;
  deviceId: string;
  flags: unknown[];
  timestamp: Date;
}

export interface CalibrationExpiredEvent {
  deviceId: string;
  calibrationId: string;
  timestamp: Date;
}

export interface BatteryLowEvent {
  deviceId: string;
  batteryLevel: number;
  timestamp: Date;
}

export type DeviceEvent =
  | DeviceConnectedEvent
  | DeviceDisconnectedEvent
  | DeviceDiscoveredEvent
  | DeviceLostEvent
  | DeviceBatteryChangedEvent
  | DeviceErrorEvent
  | MeasurementReceivedEvent
  | MeasurementValidatedEvent
  | MeasurementRejectedEvent
  | CalibrationExpiredEvent
  | BatteryLowEvent;
