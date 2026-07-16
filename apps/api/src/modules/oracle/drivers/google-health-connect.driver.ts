import { Injectable } from '@nestjs/common';
import { HealthPlatform } from '@bio/database';
import { IPlatformDriver, PlatformTokens, RawMetricRecord } from './platform-driver.interface.js';

// Google Health Connect uses on-device Android APIs; server side mirrors Google Fit OAuth
@Injectable()
export class GoogleHealthConnectDriver implements IPlatformDriver {
  readonly platform = HealthPlatform.GOOGLE_HEALTH_CONNECT;

  getAuthUrl(patientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_HEALTH_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/healthconnect.read',
      state: patientId,
      access_type: 'offline',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<PlatformTokens> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_HEALTH_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken: data['refresh_token'] as string | undefined,
      expiresAt: data['expires_in'] ? new Date(Date.now() + (data['expires_in'] as number) * 1000) : undefined,
      scopes: ['healthconnect.read'],
    };
  }

  async refreshTokens(refreshToken: string): Promise<PlatformTokens> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_HEALTH_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      accessToken: data['access_token'] as string,
      refreshToken,
      scopes: ['healthconnect.read'],
    };
  }

  async fetchData(_accessToken: string, _since: Date, _until: Date): Promise<RawMetricRecord[]> {
    // Health Connect data is pushed from the Android app; polling not supported server-side
    return [];
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, { method: 'POST' });
  }
}
