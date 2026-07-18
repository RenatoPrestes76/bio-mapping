import { IsOptional, IsString } from 'class-validator';

export class ShareChapterDto {
  @IsString()
  sharedWith!: string;

  @IsOptional()
  @IsString()
  message?: string;
}
