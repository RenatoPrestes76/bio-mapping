import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, Role } from '@bio/database';

export class UserResponseDto {
  @ApiProperty({ example: '3f1b1b1e-6b1a-4e7a-9c3a-2f8b6f4a1c2d' })
  id: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiPropertyOptional({ example: '1990-05-20', nullable: true })
  birthDate: Date | null;

  @ApiPropertyOptional({ enum: Gender, nullable: true })
  gender: Gender | null;

  @ApiProperty({ enum: Role, example: Role.PATIENT })
  role: Role;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export interface UserEntityLike {
  id: string;
  email: string;
  name: string;
  birthDate: Date | null;
  gender: Gender | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserResponse(user: UserEntityLike): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    birthDate: user.birthDate,
    gender: user.gender,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
