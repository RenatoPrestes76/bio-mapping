import { IsString, IsOptional, IsEnum, IsBoolean, IsUUID, IsObject, MinLength, MaxLength } from 'class-validator';
import { TemplateCategory } from '@bio/database';

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  scoringEngine?: string;

  @IsOptional()
  @IsObject()
  scoringConfig?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
