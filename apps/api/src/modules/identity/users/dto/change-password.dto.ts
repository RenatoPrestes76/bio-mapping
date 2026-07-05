import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'Nova senha (mín. 8 caracteres)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
