import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3nhaForte!23' })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Se true, o refresh token dura 90 dias em vez de 30',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({ example: 'iPhone 16', description: 'Nome do dispositivo, definido pelo client' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ example: 'MOBILE', description: 'Tipo do dispositivo, definido pelo client' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}
