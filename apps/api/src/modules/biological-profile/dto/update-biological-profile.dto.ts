import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ActivityLevel, BloodType } from '@bio/database';

export class UpdateBiologicalProfileDto {
  @ApiPropertyOptional({ example: 178, description: 'Altura em centímetros' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ example: 74.5, description: 'Peso em quilogramas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 18.2, description: 'Percentual de gordura corporal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bodyFat?: number;

  @ApiPropertyOptional({ example: 32.1, description: 'Massa muscular em quilogramas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  muscleMass?: number;

  @ApiPropertyOptional({ example: 58, description: 'Frequência cardíaca de repouso (bpm)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  restingHeartRate?: number;

  @ApiPropertyOptional({ enum: BloodType, example: BloodType.O_POSITIVE })
  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @ApiPropertyOptional({ example: 'Ganho de massa magra' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ enum: ActivityLevel, example: ActivityLevel.MODERATE })
  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;
}
