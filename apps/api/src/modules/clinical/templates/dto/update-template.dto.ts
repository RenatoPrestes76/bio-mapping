import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, MinLength, MaxLength } from 'class-validator';
import { TemplateCategory } from '@bio/database';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  scoringEngine?: string;

  @IsOptional()
  @IsObject()
  scoringConfig?: Record<string, unknown>;
}
