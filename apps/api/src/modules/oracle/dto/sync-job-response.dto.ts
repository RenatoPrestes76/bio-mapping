import { HealthPlatform, OracleSyncStatus, SyncJob } from '@bio/database';

export class SyncJobResponseDto {
  id!: string;
  platform!: HealthPlatform;
  status!: OracleSyncStatus;
  startedAt!: Date;
  completedAt?: Date | null;
  rawRecordsCount!: number;
  normalizedCount!: number;
  errorCount!: number;
  errorMessage?: string | null;
}

export function toSyncJobResponse(job: SyncJob): SyncJobResponseDto {
  return {
    id: job.id,
    platform: job.platform,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    rawRecordsCount: job.rawRecordsCount,
    normalizedCount: job.normalizedCount,
    errorCount: job.errorCount,
    errorMessage: job.errorMessage,
  };
}
