export interface DeviceStatisticsDto {
  totalDevices: number;
  connectedDevices: number;
  pairedDevices: number;
  offlineDevices: number;
  errorDevices: number;
  discoveredDevices: number;
  devicesWithBattery: number;
  avgBatteryLevel: number | null;
  avgSignalQuality: number | null;
  connectionTypes: Record<string, number>;
  lastSync: Date | null;
}
