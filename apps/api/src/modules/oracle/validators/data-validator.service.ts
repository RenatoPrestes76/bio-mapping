import { Injectable } from '@nestjs/common';
import { OracleMetricType } from '@bio/database';
import { NormalizedRecord } from '../normalizers/data-normalizer.service.js';

export interface ValidationResult {
  record: NormalizedRecord;
  isValid: boolean;
  errors: string[];
}

// Physiological plausibility bounds per metric (canonical units)
const LIMITS: Record<OracleMetricType, [number, number]> = {
  [OracleMetricType.HEART_RATE]: [20, 300],
  [OracleMetricType.HRV]: [1, 300],
  [OracleMetricType.STEPS]: [0, 100_000],
  [OracleMetricType.CALORIES]: [500, 10_000],
  [OracleMetricType.SLEEP]: [0, 1440],
  [OracleMetricType.WEIGHT]: [2, 700],
  [OracleMetricType.BODY_FAT]: [1, 70],
  [OracleMetricType.SPO2]: [50, 100],
  [OracleMetricType.BLOOD_PRESSURE]: [30, 300],
  [OracleMetricType.TEMPERATURE]: [30, 45],
};

@Injectable()
export class DataValidatorService {
  validate(records: NormalizedRecord[]): ValidationResult[] {
    const seen = new Set<string>();

    return records.map((record) => {
      const errors: string[] = [];

      // Physiological limits
      const [min, max] = LIMITS[record.metricType];
      if (record.value < min || record.value > max) {
        errors.push(`${record.metricType} value ${record.value} outside physiological range [${min}, ${max}]`);
      }

      // Future timestamp
      if (record.recordedAt > new Date()) {
        errors.push(`recordedAt is in the future: ${record.recordedAt.toISOString()}`);
      }

      // Very old timestamps (>2 years) are suspicious
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      if (record.recordedAt < twoYearsAgo) {
        errors.push(`recordedAt is older than 2 years: ${record.recordedAt.toISOString()}`);
      }

      // Deduplication key: source + metricType + recordedAt (second-level)
      const dedupKey = `${record.source}:${record.metricType}:${record.recordedAt.getTime()}`;
      const isDuplicate = seen.has(dedupKey);
      if (!isDuplicate) seen.add(dedupKey);

      return {
        record,
        isValid: errors.length === 0,
        errors,
      };
    });
  }

  isDuplicateOf(
    record: NormalizedRecord,
    existingKeys: Set<string>,
  ): boolean {
    const key = `${record.source}:${record.metricType}:${record.recordedAt.getTime()}`;
    return existingKeys.has(key);
  }

  buildExistingKeys(records: Array<{ source: string; metricType: string; recordedAt: Date }>): Set<string> {
    return new Set(records.map((r) => `${r.source}:${r.metricType}:${r.recordedAt.getTime()}`));
  }
}
