import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InviteStatus, MembershipRole } from '@bio/database';

export class InviteResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() invitedBy: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: MembershipRole }) role: MembershipRole;
  @ApiProperty({ enum: InviteStatus }) status: InviteStatus;
  @ApiProperty() expiresAt: Date;
  @ApiPropertyOptional() acceptedAt?: Date | null;
  @ApiPropertyOptional() rejectedAt?: Date | null;
  @ApiProperty() createdAt: Date;
}

export function toInviteResponse(i: any): InviteResponseDto {
  return {
    id: i.id, organizationId: i.organizationId, invitedBy: i.invitedBy,
    email: i.email, role: i.role, status: i.status, expiresAt: i.expiresAt,
    acceptedAt: i.acceptedAt, rejectedAt: i.rejectedAt, createdAt: i.createdAt,
  };
}
