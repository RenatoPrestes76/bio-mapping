import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Specialty } from '@bio/database';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SearchProfessionalsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Specialty })
  @IsOptional()
  @IsEnum(Specialty)
  specialty?: Specialty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string;
}
