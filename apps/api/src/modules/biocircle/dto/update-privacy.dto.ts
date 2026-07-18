import { IsEnum, IsOptional } from 'class-validator';
import { PrivacyVisibility } from '@bio/database';

export class UpdatePrivacyDto {
  @IsOptional()
  @IsEnum(PrivacyVisibility)
  discoverableBy?: PrivacyVisibility;

  @IsOptional()
  @IsEnum(PrivacyVisibility)
  invitesFrom?: PrivacyVisibility;

  @IsOptional()
  @IsEnum(PrivacyVisibility)
  bioBookVisible?: PrivacyVisibility;

  @IsOptional()
  @IsEnum(PrivacyVisibility)
  photosVisible?: PrivacyVisibility;

  @IsOptional()
  @IsEnum(PrivacyVisibility)
  metricsVisible?: PrivacyVisibility;

  @IsOptional()
  @IsEnum(PrivacyVisibility)
  achievementsVisible?: PrivacyVisibility;
}
