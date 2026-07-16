import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { IPlatformDriver, PlatformTokens, RawMetricRecord } from './platform-driver.interface.js';

@Injectable()
export class PolarDriver implements IPlatformDriver {
  readonly platform = HealthPlatform.POLAR;

  private readonly clientId = process.env.POLAR_CLIENT_ID ?? '';
  private readonly clientSecret = process.env.POLAR_CLIENT_SECRET ?? '';
  private readonly apiBase = 'https://www.polaraccesslink.com/v3';

  getAuthUrl(patientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state: patientId,
    });
    return `https://flow.polar.com/oauth2/authorization?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch('https://polarremote.com/v2/oauth2/token', {
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
      externalUserId: data['x_user_id'] as string | undefined,
      scopes: ['accesslink.read_all'],
      expiresAt: undefined,
    };
  }

  async refreshTokens(accessToken: string): Promise<PlatformTokens> {
    // Polar AccessLink tokens don't expire
    return { accessToken, scopes: [] };
  }

  async fetchData(accessToken: string, since: Date, until: Date): Promise<RawMetricRecord[]> {
    const res = await fetch(`${this.apiBase}/exercises`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!res.ok) return [];

    const data = await res.json() as { data?: Array<Record<string, unknown>> };
    const records: RawMetricRecord[] = [];

    for (const ex of data.data ?? []) {
      const ts = new Date(ex['start_time'] as string);
      if (ts < since || ts > until) continue;
      if (typeof ex['heart_rate'] === 'object' && ex['heart_rate'] !== null) {
        const hr = ex['heart_rate'] as Record<string, unknown>;
        records.push({
          metricType: OracleMetricType.HEART_RATE,
          value: hr['average'] as number,
          unit: 'bpm',
          recordedAt: ts,
          rawPayload: ex,
        });
      }
    }
    return records;
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await fetch(`${this.apiBase}/users/self`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
