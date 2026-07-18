export class CreateTeamDto {
  name!: string;
  description?: string;
  category!: string;
  visibility?: string;
  coverImage?: string;
  logo?: string;
  maxMembers?: number;
  settings?: Record<string, unknown>;
}
