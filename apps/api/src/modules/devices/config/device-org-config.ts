export interface DeviceOrgConfig {
  bleEnabled: boolean;
  maxConnectionTimeMs: number;
  scanTimeMs: number;
  maxDevices: number;
  reconnectionPolicy: 'none' | 'always' | 'once';
}

export const DEFAULT_DEVICE_ORG_CONFIG: DeviceOrgConfig = {
  bleEnabled: true,
  maxConnectionTimeMs: 30 * 60 * 1000, // 30 minutes
  scanTimeMs: 30 * 1000,               // 30 seconds
  maxDevices: 10,
  reconnectionPolicy: 'once',
};

export function mergeOrgConfig(override?: Partial<DeviceOrgConfig> | null): DeviceOrgConfig {
  if (!override) return { ...DEFAULT_DEVICE_ORG_CONFIG };
  return { ...DEFAULT_DEVICE_ORG_CONFIG, ...override };
}
