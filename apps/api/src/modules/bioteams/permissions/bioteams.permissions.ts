export type TeamRole = 'OWNER' | 'ADMINISTRATOR' | 'COACH' | 'TRAINER' | 'NUTRITIONIST' | 'PHYSICIAN' | 'MEMBER' | 'GUEST';

const MANAGEMENT_ROLES: TeamRole[] = ['OWNER', 'ADMINISTRATOR'];
const STAFF_ROLES: TeamRole[] = ['OWNER', 'ADMINISTRATOR', 'COACH', 'TRAINER', 'NUTRITIONIST', 'PHYSICIAN'];

export function canManageTeam(role: TeamRole): boolean {
  return MANAGEMENT_ROLES.includes(role);
}

export function canInviteMembers(role: TeamRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function canManageEvents(role: TeamRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function canManageMembers(role: TeamRole): boolean {
  return MANAGEMENT_ROLES.includes(role);
}

export function canTransferOwnership(role: TeamRole): boolean {
  return role === 'OWNER';
}

export function isStaffRole(role: TeamRole): boolean {
  return STAFF_ROLES.includes(role);
}
