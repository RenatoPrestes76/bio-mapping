import { IsOptional, IsString, IsDateString, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { AnswerItemDto } from './answer-assessment.dto';

export class UpdateAssessmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers?: AnswerItemDto[];
}
