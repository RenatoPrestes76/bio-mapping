import { IsOptional, IsString } from 'class-validator';

export class GenerateChaptersDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
