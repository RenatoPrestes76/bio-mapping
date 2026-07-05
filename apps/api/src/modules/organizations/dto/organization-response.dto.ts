import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationPlan, OrganizationStatus } from '@bio/database';

export class OrganizationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() document?: string | null;
  @ApiPropertyOptional() logo?: string | null;
  @ApiProperty({ enum: OrganizationPlan }) plan: OrganizationPlan;
  @ApiProperty({ enum: OrganizationStatus }) status: OrganizationStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export function toOrganizationResponse(o: any): OrganizationResponseDto {
  return {
    id: o.id, name: o.name, document: o.document, logo: o.logo,
    plan: o.plan, status: o.status, createdAt: o.createdAt, updatedAt: o.updatedAt,
  };
}
