import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ description: 'JWT de vida curta (15 minutos), usado em todas as chamadas autenticadas' })
  accessToken: string;

  @ApiProperty({ description: 'Token opaco de vida longa (30 ou 90 dias), usado apenas em POST /auth/refresh' })
  refreshToken: string;
}
