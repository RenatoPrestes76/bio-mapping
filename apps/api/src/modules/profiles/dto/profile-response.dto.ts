import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@bio/database';

export class ProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() fullName: string;
  @ApiPropertyOptional() cpf?: string | null;
  @ApiPropertyOptional() birthDate?: Date | null;
  @ApiPropertyOptional({ enum: Gender }) gender?: Gender | null;
  @ApiPropertyOptional() phone?: string | null;
  @ApiPropertyOptional() photo?: string | null;
  @ApiPropertyOptional() address?: string | null;
  @ApiPropertyOptional() city?: string | null;
  @ApiPropertyOptional() state?: string | null;
  @ApiPropertyOptional() country?: string | null;
  @ApiPropertyOptional() zipcode?: string | null;
  @ApiPropertyOptional() timezone?: string | null;
  @ApiPropertyOptional() language?: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export function toProfileResponse(p: any): ProfileResponseDto {
  return {
    id: p.id, userId: p.userId, fullName: p.fullName, cpf: p.cpf,
    birthDate: p.birthDate, gender: p.gender, phone: p.phone, photo: p.photo,
    address: p.address, city: p.city, state: p.state, country: p.country,
    zipcode: p.zipcode, timezone: p.timezone, language: p.language,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  };
}
