import {
  IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsInt, IsArray, IsObject, Min, Max,
  MinLength, MaxLength,
} from 'class-validator';
import { FieldType } from '@bio/database';

export class CreateFieldDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  placeholder?: string;

  @IsEnum(FieldType)
  fieldType: FieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsObject()
  validationRules?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scoringWeight?: number;
}
