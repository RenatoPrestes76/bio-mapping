import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VitalSource, VitalStatus } from '@bio/database';

export class CreateVitalRecordDto {
  @ApiProperty({ example: '2025-06-01T08:30:00.000Z' })
  @IsDateString()
  recordedAt!: string;

  @ApiPropertyOptional({ enum: VitalSource, default: VitalSource.MANUAL })
  @IsOptional()
  @IsEnum(VitalSource)
  source?: VitalSource;

  @ApiPropertyOptional({ enum: VitalStatus, default: VitalStatus.DRAFT })
  @IsOptional()
  @IsEnum(VitalStatus)
  status?: VitalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  // ── Medidas Antropométricas ──────────────────────────────────────────────

  @ApiPropertyOptional({ minimum: 30, maximum: 300, description: 'Altura em cm' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  @Type(() => Number)
  height?: number;

  @ApiPropertyOptional({ minimum: 0.5, maximum: 500, description: 'Peso em kg' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(500)
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: '% gordura corporal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  bodyFatPercentage?: number;

  @ApiPropertyOptional({ description: 'Massa magra em kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(400)
  @Type(() => Number)
  leanMass?: number;

  @ApiPropertyOptional({ description: 'Massa gorda em kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  @Type(() => Number)
  fatMass?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, description: 'Gordura visceral (nível)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  visceralFat?: number;

  @ApiPropertyOptional({ description: 'Circunferência abdominal em cm' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  @Type(() => Number)
  waistCircumference?: number;

  @ApiPropertyOptional({ description: 'Circunferência do quadril em cm' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  @Type(() => Number)
  hipCircumference?: number;

  @ApiPropertyOptional({ description: 'Circunferência do pescoço em cm' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  @Type(() => Number)
  neckCircumference?: number;

  @ApiPropertyOptional({ description: 'Circunferência torácica em cm' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  @Type(() => Number)
  chestCircumference?: number;

  @ApiPropertyOptional({ description: 'Circunferência do braço em cm' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(100)
  @Type(() => Number)
  armCircumference?: number;

  @ApiPropertyOptional({ description: 'Circunferência da coxa em cm' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(150)
  @Type(() => Number)
  thighCircumference?: number;

  @ApiPropertyOptional({ description: 'Circunferência da panturrilha em cm' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  @Type(() => Number)
  calfCircumference?: number;

  // ── Sinais Vitais ────────────────────────────────────────────────────────

  @ApiPropertyOptional({ minimum: 30, maximum: 250, description: 'Frequência cardíaca em bpm' })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  @Type(() => Number)
  heartRate?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 300, description: 'Pressão sistólica mmHg' })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(300)
  @Type(() => Number)
  bloodPressureSystolic?: number;

  @ApiPropertyOptional({ minimum: 30, maximum: 200, description: 'Pressão diastólica mmHg' })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(200)
  @Type(() => Number)
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional({ minimum: 5, maximum: 60, description: 'Frequência respiratória irpm' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  @Type(() => Number)
  respiratoryRate?: number;

  @ApiPropertyOptional({ minimum: 30, maximum: 45, description: 'Temperatura corporal em °C' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  @Type(() => Number)
  bodyTemperature?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 100, description: 'Saturação de O₂ em %' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100)
  @Type(() => Number)
  oxygenSaturation?: number;

  @ApiPropertyOptional({ minimum: 10, maximum: 600, description: 'Glicemia em mg/dL' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(600)
  @Type(() => Number)
  bloodGlucose?: number;
}
