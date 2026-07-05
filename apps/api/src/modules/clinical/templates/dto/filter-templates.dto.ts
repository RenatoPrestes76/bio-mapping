import { IsOptional, IsEnum, IsBoolean, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TemplateCategory } from '@bio/database';

export class FilterTemplatesDto {
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
