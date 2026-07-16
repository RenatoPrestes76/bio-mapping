import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SleepSource {
  MANUAL = 'MANUAL',
  DEVICE = 'DEVICE',
}

export class CreateSleepMetricsDto {
  @ApiProperty({ example: '2025-07-10', description: 'Data da noite (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '2025-07-10T23:00:00Z' })
  @IsOptional()
  @IsDateString()
  bedtime?: string;

  @ApiPropertyOptional({ example: '2025-07-11T07:00:00Z' })
  @IsOptional()
  @IsDateString()
  wakeTime?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  totalMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 720 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  deepMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 720 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  remMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 720 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  lightMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 360 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(360)
  awakeMinutes?: number;

  @ApiPropertyOptional({ enum: SleepSource })
  @IsOptional()
  @IsEnum(SleepSource)
  source?: SleepSource;
}

export class UpdateSleepMetricsDto extends CreateSleepMetricsDto {}
