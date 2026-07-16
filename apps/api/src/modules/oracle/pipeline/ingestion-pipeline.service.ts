import { Injectable, Logger } from '@nestjs/common';
import { HealthPlatform, HealthSource } from '@bio/database';
import { IPlatformDriver } from '../drivers/platform-driver.interface.js';
import { DataNormalizerService } from '../normalizers/data-normalizer.service.js';
import { DataValidatorService } from '../validators/data-validator.service.js';
import { RawHealthDataRepository } from '../repositories/raw-health-data.repository.js';
import { NormalizedHealthDataRepository } from '../repositories/normalized-health-data.repository.js';
import { SyncJobRepository } from '../repositories/sync-job.repository.js';
import { SyncLogRepository } from '../repositories/sync-log.repository.js';
import { EncryptionService } from '../services/encryption.service.js';

export interface PipelineResult {
  jobId: string;
  rawCount: number;
  normalizedCount: number;
  errorCount: number;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
}

@Injectable()
export class IngestionPipelineService {
  private readonly logger = new Logger(IngestionPipelineService.name);

  constructor(
    private readonly normalizer: DataNormalizerService,
    private readonly validator: DataValidatorService,
    private readonly rawRepo: RawHealthDataRepository,
    private readonly normalizedRepo: NormalizedHealthDataRepository,
    private readonly syncJobRepo: SyncJobRepository,
    private readonly syncLogRepo: SyncLogRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async run(
    source: HealthSource,
    driver: IPlatformDriver,
    since: Date,
    until: Date,
  ): Promise<PipelineResult> {
    const job = await this.syncJobRepo.create({
      sourceId: source.id,
      patientId: source.patientId,
      platform: source.platform as HealthPlatform,
    });
    await this.syncJobRepo.start(job.id);
    await this.syncLogRepo.log(job.id, 'INFO', `Starting sync for ${source.platform} from ${since.toISOString()} to ${until.toISOString()}`);

    try {
      const accessToken = this.encryption.safeDecrypt(source.accessToken);
      if (!accessToken) {
        throw new Error('Access token missing or decryption failed');
      }

      // 1. Fetch raw data from platform driver
      const rawRecords = await driver.fetchData(accessToken, since, until);
      await this.syncLogRepo.log(job.id, 'INFO', `Fetched ${rawRecords.length} raw records from ${source.platform}`);

      if (rawRecords.length === 0) {
        await this.syncJobRepo.complete(job.id, { rawRecordsCount: 0, normalizedCount: 0, errorCount: 0 });
        return { jobId: job.id, rawCount: 0, normalizedCount: 0, errorCount: 0, status: 'COMPLETED' };
      }

      // 2. Store raw records
      await this.rawRepo.createMany(
        rawRecords.map((r) => ({
          sourceId: source.id,
          patientId: source.patientId,
          platform: source.platform as HealthPlatform,
          metricType: r.metricType,
          rawPayload: r.rawPayload,
          recordedAt: r.recordedAt,
        })),
      );

      // 3. Normalize
      const normalized = this.normalizer.normalize(rawRecords, source.platform as HealthPlatform);

      // 4. Fetch existing keys for dedup check
      const existing = await this.normalizedRepo.findExistingKeys(source.patientId, since, until);
      const existingKeys = this.validator.buildExistingKeys(existing);

      // 5. Validate
      const validationResults = this.validator.validate(normalized);
      let errorCount = 0;

      const toStore = validationResults.map((vr) => {
        if (!vr.isValid) errorCount++;
        const isDuplicate = this.validator.isDuplicateOf(vr.record, existingKeys);
        return {
          patientId: source.patientId,
          metricType: vr.record.metricType,
          value: vr.record.value,
          unit: vr.record.unit,
          recordedAt: vr.record.recordedAt,
          source: vr.record.source,
          qualifier: vr.record.qualifier,
          isDuplicate,
          isValid: vr.isValid,
          validationErrors: vr.errors,
        };
      });

      // 6. Store normalized data
      await this.normalizedRepo.createMany(toStore);

      const validCount = toStore.filter((r) => r.isValid && !r.isDuplicate).length;
      await this.syncLogRepo.log(job.id, 'INFO', `Stored ${validCount} valid normalized records (${errorCount} invalid, ${toStore.length - validCount - errorCount} duplicates)`);

      await this.syncJobRepo.complete(job.id, {
        rawRecordsCount: rawRecords.length,
        normalizedCount: validCount,
        errorCount,
      });

      return {
        jobId: job.id,
        rawCount: rawRecords.length,
        normalizedCount: validCount,
        errorCount,
        status: errorCount > 0 ? 'PARTIAL' : 'COMPLETED',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ingestion pipeline failed for source ${source.id}: ${message}`);
      await this.syncLogRepo.log(job.id, 'ERROR', message);
      await this.syncJobRepo.fail(job.id, message, false);
      return { jobId: job.id, rawCount: 0, normalizedCount: 0, errorCount: 1, status: 'FAILED' };
    }
  }
}
