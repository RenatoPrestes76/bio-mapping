export class UpdateTeamDto {
  name?: string;
  description?: string;
  visibility?: string;
  coverImage?: string;
  logo?: string;
  maxMembers?: number;
  settings?: Record<string, unknown>;
}
