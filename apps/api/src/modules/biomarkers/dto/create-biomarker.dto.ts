import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BiomarkerStatus } from '@bio/database';

export class CreateBiomarkerDto {
  @ApiProperty({ example: 'Glicose' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 95.5 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value!: number;

  @ApiProperty({ example: 'mg/dL' })
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  referenceMin?: number;

  @ApiPropertyOptional({ example: 99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  referenceMax?: number;

  @ApiPropertyOptional({ enum: BiomarkerStatus })
  @IsOptional()
  @IsEnum(BiomarkerStatus)
  status?: BiomarkerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
