import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { IPlatformDriver, PlatformTokens, RawMetricRecord } from './platform-driver.interface.js';

// Amazfit uses the Zepp Health (formerly Huami) open platform
@Injectable()
export class AmazfitDriver implements IPlatformDriver {
  readonly platform = HealthPlatform.AMAZFIT;

  private readonly appId = process.env.AMAZFIT_APP_ID ?? '';
  private readonly appSecret = process.env.AMAZFIT_APP_SECRET ?? '';
  private readonly apiBase = 'https://open-us.zepp-life.com/openapi/v1';

  getAuthUrl(patientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: patientId,
    });
    return `https://open-us.zepp-life.com/openapi/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens> {
    const res = await fetch(`${this.apiBase}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: this.appId, app_secret: this.appSecret, code, redirect_uri: redirectUri }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken: data['refresh_token'] as string | undefined,
      expiresAt: data['expires_in'] ? new Date(Date.now() + (data['expires_in'] as number) * 1000) : undefined,
      scopes: ['health.read'],
      externalUserId: data['open_id'] as string | undefined,
    };
  }

  async refreshTokens(refreshToken: string): Promise<PlatformTokens> {
    const res = await fetch(`${this.apiBase}/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: this.appId, app_secret: this.appSecret, refresh_token: refreshToken }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken: data['refresh_token'] as string | undefined,
      scopes: ['health.read'],
    };
  }

  async fetchData(accessToken: string, since: Date, until: Date): Promise<RawMetricRecord[]> {
    const res = await fetch(
      `${this.apiBase}/health/heart_rate?from=${Math.floor(since.getTime() / 1000)}&to=${Math.floor(until.getTime() / 1000)}`,
      { headers: { access_token: accessToken } },
    );
    if (!res.ok) return [];

    const data = await res.json() as { data?: Array<Record<string, unknown>> };
    return (data.data ?? []).map((item) => ({
      metricType: OracleMetricType.HEART_RATE,
      value: item['heartRate'] as number,
      unit: 'bpm',
      recordedAt: new Date((item['time'] as number) * 1000),
      rawPayload: item,
    }));
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await fetch(`${this.apiBase}/token/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
  }
}
