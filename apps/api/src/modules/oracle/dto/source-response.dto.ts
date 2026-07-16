import { HealthPlatform, HealthSource, HealthSourceStatus } from '@bio/database';

export class SourceResponseDto {
  id!: string;
  platform!: HealthPlatform;
  status!: HealthSourceStatus;
  scopes!: string[];
  externalUserId?: string | null;
  lastSyncAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export function toSourceResponse(source: HealthSource): SourceResponseDto {
  return {
    id: source.id,
    platform: source.platform,
    status: source.status,
    scopes: source.scopes,
    externalUserId: source.externalUserId,
    lastSyncAt: source.lastSyncAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}
