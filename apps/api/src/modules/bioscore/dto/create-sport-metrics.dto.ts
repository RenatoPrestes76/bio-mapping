import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SportType {
  RUNNING = 'RUNNING',
  CYCLING = 'CYCLING',
  SWIMMING = 'SWIMMING',
  STRENGTH = 'STRENGTH',
  OTHER = 'OTHER',
}

export class CreateSportMetricsDto {
  @ApiProperty()
  @IsDateString()
  recordedAt: string;

  @ApiProperty({ enum: SportType })
  @IsEnum(SportType)
  sport: SportType;

  // Running
  @ApiPropertyOptional({ description: 'Pace médio em segundos/km' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  avgPaceSecPerKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  maxPaceSecPerKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(90)
  vo2maxEstimated?: number;

  @ApiPropertyOptional({ description: 'Distância semanal em metros' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  weeklyDistanceM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weeklyLoadPoints?: number;

  // Cycling
  @ApiPropertyOptional({ description: 'FTP estimado em Watts' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedFtpWatts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  avgCadenceRpm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  avgSpeedKph?: number;

  // Swimming
  @ApiPropertyOptional({ description: 'Pace médio por 100m em segundos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(40)
  avgPacePer100mSec?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  swolf?: number;

  // Strength
  @ApiPropertyOptional({ description: 'Total de séries na semana' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  weeklyVolumeSets?: number;

  @ApiPropertyOptional({ description: 'Tonelagem semanal em kg' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weeklyTonnageKg?: number;

  @ApiPropertyOptional({ description: 'Progressão de carga em %' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  loadProgressionPct?: number;

  // Common
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sessionCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7)
  activeDays?: number;
}
