import { Injectable } from '@nestjs/common';
import { HealthPlatform } from '@bio/database';
import { IPlatformDriver, PlatformTokens, RawMetricRecord } from './platform-driver.interface.js';

@Injectable()
export class AppleHealthDriver implements IPlatformDriver {
  readonly platform = HealthPlatform.APPLE_HEALTH;

  getAuthUrl(patientId: string, redirectUri: string): string {
    // Apple Health uses HealthKit on-device — no server-side OAuth URL
    // Data is pushed from the iOS app via local export
    return `healthkit://authorize?state=${patientId}&redirect=${encodeURIComponent(redirectUri)}`;
  }

  async exchangeCode(code: string, _redirectUri: string): Promise<PlatformTokens> {
    // Apple Health Connect uses short-lived export tokens
    return {
      accessToken: code,
      scopes: ['HKQuantityTypeIdentifierHeartRate', 'HKCategoryTypeIdentifierSleepAnalysis'],
      externalUserId: undefined,
    };
  }

  async refreshTokens(_refreshToken: string): Promise<PlatformTokens> {
    // Apple HealthKit tokens don't expire in the traditional sense
    return { accessToken: _refreshToken, scopes: [] };
  }

  async fetchData(_accessToken: string, _since: Date, _until: Date): Promise<RawMetricRecord[]> {
    // Actual implementation requires iOS HealthKit export parsing
    // In production, the iOS app POSTs data directly to /oracle/ingest
    return [];
  }

  async revokeAccess(_accessToken: string): Promise<void> {
    // Handled on-device via HealthKit revocation
  }
}
