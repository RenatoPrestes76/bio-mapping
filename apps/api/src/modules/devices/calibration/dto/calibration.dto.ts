import { IsOptional, IsString, IsObject, IsDateString } from 'class-validator';

export class CreateCalibrationDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  referenceValues?: Record<string, number>;
}

export interface CalibrationResponseDto {
  id: string;
  deviceId: string;
  calibratedBy: string;
  calibratedAt: Date;
  expiresAt: Date | null;
  notes: string | null;
  referenceValues: Record<string, number> | null;
  isValid: boolean;
}
