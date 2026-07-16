import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { HealthPlatform } from '@bio/database';
import { Type } from 'class-transformer';

export class SyncSourceDto {
  @IsEnum(HealthPlatform)
  platform!: HealthPlatform;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  daysSince?: number;
}
