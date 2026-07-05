import { Role } from '@bio/database';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
