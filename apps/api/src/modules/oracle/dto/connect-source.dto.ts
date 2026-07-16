import { IsEnum, IsString, IsUrl } from 'class-validator';
import { HealthPlatform } from '@bio/database';

export class ConnectSourceDto {
  @IsEnum(HealthPlatform)
  platform!: HealthPlatform;

  @IsString()
  code!: string;

  @IsUrl({ require_tld: false })
  redirectUri!: string;
}
