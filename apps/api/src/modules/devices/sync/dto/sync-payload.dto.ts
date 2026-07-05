import { IsString, IsNotEmpty, IsObject, IsOptional, IsDateString } from 'class-validator';

export class SyncPayloadDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsDateString()
  @IsOptional()
  timestamp?: string;

  @IsString()
  @IsNotEmpty()
  dataType: string;

  @IsObject()
  data: Record<string, unknown>;
}

export interface ProcessedSyncPayload {
  deviceId: string;
  sessionId: string;
  timestamp: Date;
  dataType: string;
  data: Record<string, unknown>;
  processedAt: Date;
}
