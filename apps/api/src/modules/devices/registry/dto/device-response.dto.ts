export interface DeviceResponseDto {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  firmwareVersion: string | null;
  connectionType: string;
  status: string;
  lastSeen: Date | null;
  batteryLevel: number | null;
  macAddress: string | null;
  rssi: number | null;
  signalStrength: string | null;
  organizationId: string | null;
  patientId: string | null;
  pairedBy: string | null;
  pairedAt: Date | null;
  // telemetry
  totalConnections: number;
  totalReconnections: number;
  totalErrors: number;
  avgSignalQuality: number | null;
  avgLatencyMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toDeviceResponse(d: any): DeviceResponseDto {
  return {
    id: d.id,
    name: d.name,
    manufacturer: d.manufacturer ?? null,
    model: d.model ?? null,
    serialNumber: d.serialNumber ?? null,
    firmwareVersion: d.firmwareVersion ?? null,
    connectionType: d.connectionType,
    status: d.status,
    lastSeen: d.lastSeen ?? null,
    batteryLevel: d.batteryLevel ?? null,
    macAddress: d.macAddress ?? null,
    rssi: d.rssi ?? null,
    signalStrength: d.signalStrength ?? null,
    organizationId: d.organizationId ?? null,
    patientId: d.patientId ?? null,
    pairedBy: d.pairedBy ?? null,
    pairedAt: d.pairedAt ?? null,
    totalConnections: d.totalConnections ?? 0,
    totalReconnections: d.totalReconnections ?? 0,
    totalErrors: d.totalErrors ?? 0,
    avgSignalQuality: d.avgSignalQuality ?? null,
    avgLatencyMs: d.avgLatencyMs ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
