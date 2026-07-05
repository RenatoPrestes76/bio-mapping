import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '@bio/database';

export class MembershipResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: MembershipRole }) role: MembershipRole;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export function toMembershipResponse(m: any): MembershipResponseDto {
  return { id: m.id, organizationId: m.organizationId, userId: m.userId, role: m.role, createdAt: m.createdAt, updatedAt: m.updatedAt };
}
