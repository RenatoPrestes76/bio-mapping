import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { IPlatformDriver, PlatformTokens, RawMetricRecord } from './platform-driver.interface.js';

// Samsung Health uses Health Platform API (partner access only)
@Injectable()
export class SamsungHealthDriver implements IPlatformDriver {
  readonly platform = HealthPlatform.SAMSUNG_HEALTH;

  private readonly clientId = process.env.SAMSUNG_HEALTH_CLIENT_ID ?? '';
  private readonly clientSecret = process.env.SAMSUNG_HEALTH_CLIENT_SECRET ?? '';
  private readonly apiBase = 'https://shealth.samsung.com/api/health';

  getAuthUrl(patientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'com.samsung.health.heart_rate com.samsung.health.step_daily_trend',
      redirect_uri: redirectUri,
      state: patientId,
    });
    return `https://account.samsung.com/accounts/v1/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens> {
    const res = await fetch('https://account.samsung.com/accounts/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken: data['refresh_token'] as string | undefined,
      expiresAt: data['expires_in'] ? new Date(Date.now() + (data['expires_in'] as number) * 1000) : undefined,
      scopes: ['heart_rate', 'steps'],
    };
  }

  async refreshTokens(refreshToken: string): Promise<PlatformTokens> {
    const res = await fetch('https://account.samsung.com/accounts/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken: data['refresh_token'] as string | undefined,
      scopes: ['heart_rate', 'steps'],
    };
  }

  async fetchData(accessToken: string, since: Date, until: Date): Promise<RawMetricRecord[]> {
    const res = await fetch(
      `${this.apiBase}/heart_rate?start_time=${since.toISOString()}&end_time=${until.toISOString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return [];

    const data = await res.json() as { items?: Array<Record<string, unknown>> };
    return (data.items ?? []).map((item) => ({
      metricType: OracleMetricType.HEART_RATE,
      value: item['heart_rate'] as number,
      unit: 'bpm',
      recordedAt: new Date(item['start_time'] as string),
      rawPayload: item,
    }));
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await fetch('https://account.samsung.com/accounts/v1/oauth2/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: accessToken }),
    });
  }
}
