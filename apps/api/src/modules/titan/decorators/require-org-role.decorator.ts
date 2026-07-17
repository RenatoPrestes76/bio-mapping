import { SetMetadata } from '@nestjs/common';
import { MembershipRole } from '@bio/database';

export const ORG_ROLES_KEY = 'orgRoles';

export const RequireOrgRole = (...roles: MembershipRole[]) => SetMetadata(ORG_ROLES_KEY, roles);
