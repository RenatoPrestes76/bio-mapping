import { IsArray, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { OracleMetricType } from '@bio/database';
import { Transform } from 'class-transformer';

export class TimelineQueryDto {
  @IsOptional()
  @IsArray()
  @IsEnum(OracleMetricType, { each: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  metrics?: OracleMetricType[];

  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsDateString()
  until?: string;
}
