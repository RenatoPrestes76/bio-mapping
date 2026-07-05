import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VitalSource, VitalStatus } from '@bio/database';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterVitalsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Data inicial (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filtrar por profissional' })
  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @ApiPropertyOptional({ enum: VitalSource })
  @IsOptional()
  @IsEnum(VitalSource)
  source?: VitalSource;

  @ApiPropertyOptional({ enum: VitalStatus })
  @IsOptional()
  @IsEnum(VitalStatus)
  status?: VitalStatus;
}
