import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BloodType } from '@bio/database';

export class PatientResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional() registrationCode?: string | null;
  @ApiPropertyOptional({ enum: BloodType }) bloodType?: BloodType | null;
  @ApiPropertyOptional() height?: number | null;
  @ApiPropertyOptional() weight?: number | null;
  @ApiPropertyOptional() primaryProfessionalId?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export function toPatientResponse(p: any): PatientResponseDto {
  return {
    id: p.id, userId: p.userId, registrationCode: p.registrationCode,
    bloodType: p.bloodType, height: p.height, weight: p.weight,
    primaryProfessionalId: p.primaryProfessionalId, notes: p.notes,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  };
}
