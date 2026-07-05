import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationPlan, OrganizationStatus } from '@bio/database';

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ enum: OrganizationPlan })
  @IsOptional()
  @IsEnum(OrganizationPlan)
  plan?: OrganizationPlan;

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
