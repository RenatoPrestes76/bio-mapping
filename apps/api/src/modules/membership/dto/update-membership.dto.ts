import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '@bio/database';

export class UpdateMembershipDto {
  @ApiProperty({ enum: MembershipRole })
  @IsEnum(MembershipRole)
  role: MembershipRole;
}
