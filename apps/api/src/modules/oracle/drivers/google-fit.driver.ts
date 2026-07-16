import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { IPlatformDriver, PlatformTokens, RawMetricRecord } from './platform-driver.interface.js';

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
];

@Injectable()
export class GoogleFitDriver implements IPlatformDriver {
  readonly platform = HealthPlatform.GOOGLE_FIT;

  private readonly clientId = process.env.GOOGLE_FIT_CLIENT_ID ?? '';
  private readonly clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET ?? '';
  private readonly tokenEndpoint = 'https://oauth2.googleapis.com/token';
  private readonly revokeEndpoint = 'https://oauth2.googleapis.com/revoke';
  private readonly dataEndpoint = 'https://www.googleapis.com/fitness/v1/users/me/dataSources';

  getAuthUrl(patientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      state: patientId,
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens> {
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken: data['refresh_token'] as string | undefined,
      expiresAt: data['expires_in'] ? new Date(Date.now() + (data['expires_in'] as number) * 1000) : undefined,
      scopes: SCOPES,
    };
  }

  async refreshTokens(refreshToken: string): Promise<PlatformTokens> {
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken,
      expiresAt: data['expires_in'] ? new Date(Date.now() + (data['expires_in'] as number) * 1000) : undefined,
      scopes: SCOPES,
    };
  }

  async fetchData(accessToken: string, since: Date, until: Date): Promise<RawMetricRecord[]> {
    const startNs = since.getTime() * 1_000_000;
    const endNs = until.getTime() * 1_000_000;
    const url = `${this.dataEndpoint}/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/datasets/${startNs}-${endNs}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];

    const data = await res.json() as { point?: Array<Record<string, unknown>> };
    return (data.point ?? []).map((p) => {
      const ts = Number((p['endTimeNanos'] as string)) / 1_000_000;
      const val = ((p['value'] as Array<{ fpVal?: number }>)?.[0]?.fpVal) ?? 0;
      return {
        metricType: OracleMetricType.HEART_RATE,
        value: val,
        unit: 'bpm',
        recordedAt: new Date(ts),
        rawPayload: p as Record<string, unknown>,
      };
    });
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await fetch(`${this.revokeEndpoint}?token=${accessToken}`, { method: 'POST' });
  }
}
