import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationPlan } from '@bio/database';

export class CreateOrganizationDto {
  @ApiProperty()
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiPropertyOptional({ description: 'CNPJ ou outro documento' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ enum: OrganizationPlan, default: 'FREE' })
  @IsOptional()
  @IsEnum(OrganizationPlan)
  plan?: OrganizationPlan;
}
