import { IsUUID, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';

export class CreateAssessmentDto {
  @IsUUID()
  templateId: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
