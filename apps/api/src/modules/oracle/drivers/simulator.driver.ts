import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { IPlatformDriver, PlatformTokens, RawMetricRecord } from './platform-driver.interface.js';

const SIMULATOR_TOKEN = 'simulator-static-token';

@Injectable()
export class SimulatorDriver implements IPlatformDriver {
  readonly platform = HealthPlatform.SIMULATOR;

  getAuthUrl(patientId: string, _redirectUri: string): string {
    return `simulator://authorize?patient=${patientId}&token=${SIMULATOR_TOKEN}`;
  }

  async exchangeCode(_code: string, _redirectUri: string): Promise<PlatformTokens> {
    return {
      accessToken: SIMULATOR_TOKEN,
      scopes: ['all'],
      externalUserId: 'simulator-user',
    };
  }

  async refreshTokens(_refreshToken: string): Promise<PlatformTokens> {
    return { accessToken: SIMULATOR_TOKEN, scopes: ['all'] };
  }

  async fetchData(_accessToken: string, since: Date, until: Date): Promise<RawMetricRecord[]> {
    const records: RawMetricRecord[] = [];
    const current = new Date(since);
    const end = until;

    while (current <= end) {
      const ts = new Date(current);

      records.push({
        metricType: OracleMetricType.HEART_RATE,
        value: this.jitter(62, 8),
        unit: 'bpm',
        recordedAt: ts,
        rawPayload: { source: 'simulator', metric: 'heart_rate' },
      });

      records.push({
        metricType: OracleMetricType.STEPS,
        value: Math.round(this.jitter(8500, 2000)),
        unit: 'steps',
        recordedAt: ts,
        rawPayload: { source: 'simulator', metric: 'steps' },
      });

      records.push({
        metricType: OracleMetricType.SLEEP,
        value: this.jitter(7.2, 0.8),
        unit: 'hours',
        recordedAt: ts,
        rawPayload: { source: 'simulator', metric: 'sleep' },
      });

      records.push({
        metricType: OracleMetricType.CALORIES,
        value: Math.round(this.jitter(2200, 300)),
        unit: 'kcal',
        recordedAt: ts,
        rawPayload: { source: 'simulator', metric: 'calories' },
      });

      records.push({
        metricType: OracleMetricType.SPO2,
        value: this.jitter(97.5, 1),
        unit: '%',
        recordedAt: ts,
        rawPayload: { source: 'simulator', metric: 'spo2' },
      });

      records.push({
        metricType: OracleMetricType.HRV,
        value: this.jitter(55, 10),
        unit: 'ms',
        recordedAt: ts,
        rawPayload: { source: 'simulator', metric: 'hrv' },
      });

      current.setDate(current.getDate() + 1);
    }

    return records;
  }

  async revokeAccess(_accessToken: string): Promise<void> {
    // Simulator never needs revocation
  }

  private jitter(base: number, spread: number): number {
    const raw = base + (Math.random() * 2 - 1) * spread;
    return Math.round(raw * 10) / 10;
  }
}
