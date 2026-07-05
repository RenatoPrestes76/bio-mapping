export interface SessionResponseDto {
  id: string;
  deviceId: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  bytesReceived: string;
  bytesSent: string;
  reconnections: number;
  signalQuality: number | null;
  latencyMs: number | null;
  error: string | null;
  durationMs: number | null;
}

export function toSessionResponse(s: any): SessionResponseDto {
  return {
    id: s.id,
    deviceId: s.deviceId,
    status: s.status,
    startedAt: s.startedAt,
    endedAt: s.endedAt ?? null,
    bytesReceived: s.bytesReceived?.toString() ?? '0',
    bytesSent: s.bytesSent?.toString() ?? '0',
    reconnections: s.reconnections ?? 0,
    signalQuality: s.signalQuality ?? null,
    latencyMs: s.latencyMs ?? null,
    error: s.error ?? null,
    durationMs: s.endedAt ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime() : null,
  };
}
