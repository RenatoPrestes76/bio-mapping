import { IsEnum, IsString } from 'class-validator';
import { ConnectionRelationshipType } from '@bio/database';

export class SendInviteDto {
  @IsString()
  receiverId!: string;

  @IsEnum(ConnectionRelationshipType)
  relationshipType!: ConnectionRelationshipType;
}
