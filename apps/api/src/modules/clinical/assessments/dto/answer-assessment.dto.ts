import { IsUUID, IsOptional, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerItemDto {
  @IsUUID()
  fieldId: string;

  @IsOptional()
  @IsString()
  value?: string | null;

  @IsOptional()
  @IsNumber()
  score?: number | null;

  @IsOptional()
  @IsString()
  comment?: string | null;
}

export class AnswerAssessmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}
