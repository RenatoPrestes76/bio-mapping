import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Gender } from '@bio/database';

export class RegisterDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3nhaForte!23', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '1990-05-20' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.FEMALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'iPhone 16', description: 'Nome do dispositivo, definido pelo client' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ example: 'MOBILE', description: 'Tipo do dispositivo, definido pelo client' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}
