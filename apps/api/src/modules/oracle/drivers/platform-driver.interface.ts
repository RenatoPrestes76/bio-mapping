import { HealthPlatform, OracleMetricType } from '@bio/database';

export interface RawMetricRecord {
  metricType: OracleMetricType;
  value: number;
  unit: string;
  recordedAt: Date;
  qualifier?: string;
  rawPayload: Record<string, unknown>;
}

export interface PlatformTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
  externalUserId?: string;
}

export interface IPlatformDriver {
  readonly platform: HealthPlatform;

  getAuthUrl(patientId: string, redirectUri: string): string;

  exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<PlatformTokens>;

  refreshTokens(refreshToken: string): Promise<PlatformTokens>;

  fetchData(
    accessToken: string,
    since: Date,
    until: Date,
  ): Promise<RawMetricRecord[]>;

  revokeAccess(accessToken: string): Promise<void>;
}
