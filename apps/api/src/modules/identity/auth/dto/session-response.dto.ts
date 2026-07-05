import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true, example: 'iPhone 16' })
  deviceName: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'MOBILE' })
  deviceType: string | null;

  @ApiPropertyOptional({ nullable: true, example: '187.10.20.5' })
  ip: string | null;

  @ApiProperty()
  lastSeenAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  expiresAt: Date;
}
