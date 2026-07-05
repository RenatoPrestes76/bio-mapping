import { IsString, IsOptional, IsInt, Min, MinLength, MaxLength } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
