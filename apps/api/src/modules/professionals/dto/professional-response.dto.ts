import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Specialty } from '@bio/database';

export class ProfessionalResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: Specialty }) specialty: Specialty;
  @ApiPropertyOptional() licenseNumber?: string | null;
  @ApiPropertyOptional() licenseState?: string | null;
  @ApiPropertyOptional() institution?: string | null;
  @ApiPropertyOptional() bio?: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export function toProfessionalResponse(p: any): ProfessionalResponseDto {
  return {
    id: p.id, userId: p.userId, specialty: p.specialty,
    licenseNumber: p.licenseNumber, licenseState: p.licenseState,
    institution: p.institution, bio: p.bio,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  };
}
