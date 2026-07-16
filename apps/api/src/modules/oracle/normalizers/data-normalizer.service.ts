import { Injectable } from '@nestjs/common';
import { HealthPlatform, OracleMetricType } from '@bio/database';
import { RawMetricRecord } from '../drivers/platform-driver.interface.js';

export interface NormalizedRecord {
  metricType: OracleMetricType;
  value: number;
  unit: string;
  recordedAt: Date;
  source: HealthPlatform;
  qualifier?: string;
}

// Canonical units per metric type
const CANONICAL_UNITS: Record<OracleMetricType, string> = {
  [OracleMetricType.HEART_RATE]: 'bpm',
  [OracleMetricType.HRV]: 'ms',
  [OracleMetricType.STEPS]: 'steps',
  [OracleMetricType.CALORIES]: 'kcal',
  [OracleMetricType.SLEEP]: 'minutes',
  [OracleMetricType.WEIGHT]: 'kg',
  [OracleMetricType.BODY_FAT]: '%',
  [OracleMetricType.SPO2]: '%',
  [OracleMetricType.BLOOD_PRESSURE]: 'mmHg',
  [OracleMetricType.TEMPERATURE]: '°C',
};

@Injectable()
export class DataNormalizerService {
  normalize(records: RawMetricRecord[], platform: HealthPlatform): NormalizedRecord[] {
    return records.map((r) => ({
      metricType: r.metricType,
      value: this.convertToCanonical(r.metricType, r.value, r.unit),
      unit: CANONICAL_UNITS[r.metricType],
      recordedAt: this.normalizeTimestamp(r.recordedAt),
      source: platform,
      qualifier: r.qualifier,
    }));
  }

  private convertToCanonical(type: OracleMetricType, value: number, unit: string): number {
    switch (type) {
      case OracleMetricType.WEIGHT:
        if (unit === 'lbs' || unit === 'lb') return Math.round(value * 0.453592 * 100) / 100;
        if (unit === 'g') return value / 1000;
        return value;

      case OracleMetricType.TEMPERATURE:
        if (unit === '°F' || unit === 'F') return Math.round((value - 32) * 5 / 9 * 10) / 10;
        return value;

      case OracleMetricType.SLEEP:
        if (unit === 'hours' || unit === 'h') return Math.round(value * 60);
        if (unit === 'seconds' || unit === 's') return Math.round(value / 60);
        return value; // assume minutes

      default:
        return value;
    }
  }

  private normalizeTimestamp(ts: Date): Date {
    // Truncate sub-second precision and return UTC
    return new Date(Math.floor(ts.getTime() / 1000) * 1000);
  }
}
