import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { IPlatformDriver, PlatformTokens, RawMetricRecord } from './platform-driver.interface.js';

@Injectable()
export class GarminDriver implements IPlatformDriver {
  readonly platform = HealthPlatform.GARMIN;

  private readonly consumerKey = process.env.GARMIN_CONSUMER_KEY ?? '';
  private readonly consumerSecret = process.env.GARMIN_CONSUMER_SECRET ?? '';
  private readonly requestTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
  private readonly accessTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
  private readonly apiBase = 'https://apis.garmin.com/wellness-api/rest';

  getAuthUrl(patientId: string, redirectUri: string): string {
    // Garmin uses OAuth 1.0a — the request token must be fetched server-side first
    // This URL is returned after obtaining a request token
    return `https://connect.garmin.com/oauthConfirm?oauth_token=REQUEST_TOKEN&state=${patientId}&redirect=${encodeURIComponent(redirectUri)}`;
  }

  async exchangeCode(oauthToken: string, _redirectUri: string): Promise<PlatformTokens> {
    // Full OAuth 1.0a exchange happens server-side; simplified stub
    return {
      accessToken: oauthToken,
      scopes: ['ACTIVITY_EXPORT', 'HEART_RATE_EXPORT'],
      externalUserId: undefined,
    };
  }

  async refreshTokens(accessToken: string): Promise<PlatformTokens> {
    // Garmin OAuth 1.0a tokens don't expire
    return { accessToken, scopes: [] };
  }

  async fetchData(accessToken: string, since: Date, until: Date): Promise<RawMetricRecord[]> {
    const url = `${this.apiBase}/dailies?uploadStartTimeInSeconds=${Math.floor(since.getTime() / 1000)}&uploadEndTimeInSeconds=${Math.floor(until.getTime() / 1000)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];

    const data = await res.json() as { dailies?: Array<Record<string, unknown>> };
    const records: RawMetricRecord[] = [];

    for (const day of data.dailies ?? []) {
      const ts = new Date((day['startTimeInSeconds'] as number) * 1000);
      if (typeof day['averageHeartRateInBeatsPerMinute'] === 'number') {
        records.push({
          metricType: OracleMetricType.HEART_RATE,
          value: day['averageHeartRateInBeatsPerMinute'],
          unit: 'bpm',
          recordedAt: ts,
          rawPayload: day,
        });
      }
      if (typeof day['steps'] === 'number') {
        records.push({
          metricType: OracleMetricType.STEPS,
          value: day['steps'],
          unit: 'steps',
          recordedAt: ts,
          rawPayload: day,
        });
      }
    }
    return records;
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await fetch(`${this.apiBase}/user/token`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
