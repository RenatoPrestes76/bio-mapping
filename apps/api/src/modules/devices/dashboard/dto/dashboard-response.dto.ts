export interface DeviceDashboardDto {
  // Active devices
  totalDevices: number;
  activeDevices: number;
  connectedDevices: number;
  devicesWithLowBattery: number;

  // Recent measurements
  totalMeasurements: number;
  measurementsLast24h: number;
  measurementsValidated: number;
  measurementsRejected: number;

  // Failures + telemetry
  totalErrors: number;
  avgSignalQuality: number | null;
  avgLatencyMs: number | null;

  // Sessions
  activeSessions: number;
  totalSessions: number;
  avgSessionDurationMs: number | null;

  // Recent
  recentMeasurements: RecentMeasurementDto[];
  deviceSummaries: DeviceSummaryDto[];
}

export interface RecentMeasurementDto {
  id: string;
  deviceId: string;
  driverName: string;
  measurementType: string;
  status: string;
  recordedAt: Date;
  validFlags: number;
}

export interface DeviceSummaryDto {
  id: string;
  name: string;
  status: string;
  batteryLevel: number | null;
  signalStrength: string | null;
  lastSeen: Date | null;
  totalErrors: number;
  latestMeasurementAt: Date | null;
}
