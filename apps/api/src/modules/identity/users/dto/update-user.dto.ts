import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender } from '@bio/database';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '1990-05-20' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.FEMALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
