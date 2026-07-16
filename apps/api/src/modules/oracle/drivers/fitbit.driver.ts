import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { IPlatformDriver, PlatformTokens, RawMetricRecord } from './platform-driver.interface.js';

const SCOPES = 'heartrate activity sleep weight profile';

@Injectable()
export class FitbitDriver implements IPlatformDriver {
  readonly platform = HealthPlatform.FITBIT;

  private readonly clientId = process.env.FITBIT_CLIENT_ID ?? '';
  private readonly clientSecret = process.env.FITBIT_CLIENT_SECRET ?? '';
  private readonly tokenEndpoint = 'https://api.fitbit.com/oauth2/token';
  private readonly apiBase = 'https://api.fitbit.com/1/user/-';

  getAuthUrl(patientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: SCOPES,
      redirect_uri: redirectUri,
      state: patientId,
    });
    return `https://www.fitbit.com/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken: data['refresh_token'] as string | undefined,
      expiresAt: data['expires_in'] ? new Date(Date.now() + (data['expires_in'] as number) * 1000) : undefined,
      scopes: SCOPES.split(' '),
      externalUserId: data['user_id'] as string | undefined,
    };
  }

  async refreshTokens(refreshToken: string): Promise<PlatformTokens> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken: data['refresh_token'] as string | undefined,
      expiresAt: data['expires_in'] ? new Date(Date.now() + (data['expires_in'] as number) * 1000) : undefined,
      scopes: SCOPES.split(' '),
    };
  }

  async fetchData(accessToken: string, since: Date, _until: Date): Promise<RawMetricRecord[]> {
    const date = since.toISOString().split('T')[0];
    const res = await fetch(`${this.apiBase}/activities/heart/date/${date}/1d/1min.json`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];

    const data = await res.json() as Record<string, unknown>;
    const hrData = (data['activities-heart'] as Array<Record<string, unknown>>)?.[0];
    if (!hrData) return [];

    const restingHr = (hrData['value'] as Record<string, unknown>)?.['restingHeartRate'];
    if (typeof restingHr !== 'number') return [];

    return [{
      metricType: OracleMetricType.HEART_RATE,
      value: restingHr,
      unit: 'bpm',
      qualifier: 'resting',
      recordedAt: new Date(date),
      rawPayload: hrData,
    }];
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await fetch('https://api.fitbit.com/oauth2/revoke', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token: accessToken }),
    });
  }
}
