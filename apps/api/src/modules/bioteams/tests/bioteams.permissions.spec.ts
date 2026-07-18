import { describe, it, expect } from '@jest/globals';
import {
  canManageTeam,
  canInviteMembers,
  canManageEvents,
  canManageMembers,
  canTransferOwnership,
  isStaffRole,
} from '../permissions/bioteams.permissions.js';
import type { TeamRole } from '../permissions/bioteams.permissions.js';

const ALL_ROLES: TeamRole[] = ['OWNER', 'ADMINISTRATOR', 'COACH', 'TRAINER', 'NUTRITIONIST', 'PHYSICIAN', 'MEMBER', 'GUEST'];

describe('bioteams.permissions', () => {
  describe('canManageTeam', () => {
    it('allows OWNER and ADMINISTRATOR', () => {
      expect(canManageTeam('OWNER')).toBe(true);
      expect(canManageTeam('ADMINISTRATOR')).toBe(true);
    });

    it('denies staff and member roles', () => {
      for (const role of ['COACH', 'TRAINER', 'NUTRITIONIST', 'PHYSICIAN', 'MEMBER', 'GUEST'] as TeamRole[]) {
        expect(canManageTeam(role)).toBe(false);
      }
    });
  });

  describe('canInviteMembers', () => {
    it('allows all staff roles', () => {
      for (const role of ['OWNER', 'ADMINISTRATOR', 'COACH', 'TRAINER', 'NUTRITIONIST', 'PHYSICIAN'] as TeamRole[]) {
        expect(canInviteMembers(role)).toBe(true);
      }
    });

    it('denies MEMBER and GUEST', () => {
      expect(canInviteMembers('MEMBER')).toBe(false);
      expect(canInviteMembers('GUEST')).toBe(false);
    });
  });

  describe('canManageEvents', () => {
    it('allows staff roles', () => {
      for (const role of ['OWNER', 'ADMINISTRATOR', 'COACH', 'TRAINER'] as TeamRole[]) {
        expect(canManageEvents(role)).toBe(true);
      }
    });

    it('denies non-staff roles', () => {
      expect(canManageEvents('MEMBER')).toBe(false);
      expect(canManageEvents('GUEST')).toBe(false);
    });
  });

  describe('canManageMembers', () => {
    it('allows OWNER and ADMINISTRATOR only', () => {
      expect(canManageMembers('OWNER')).toBe(true);
      expect(canManageMembers('ADMINISTRATOR')).toBe(true);
    });

    it('denies COACH and below', () => {
      expect(canManageMembers('COACH')).toBe(false);
      expect(canManageMembers('MEMBER')).toBe(false);
    });
  });

  describe('canTransferOwnership', () => {
    it('allows only OWNER', () => {
      expect(canTransferOwnership('OWNER')).toBe(true);
    });

    it('denies all other roles', () => {
      for (const role of ALL_ROLES.filter((r) => r !== 'OWNER')) {
        expect(canTransferOwnership(role)).toBe(false);
      }
    });
  });

  describe('isStaffRole', () => {
    it('returns true for staff roles', () => {
      for (const role of ['OWNER', 'ADMINISTRATOR', 'COACH', 'TRAINER', 'NUTRITIONIST', 'PHYSICIAN'] as TeamRole[]) {
        expect(isStaffRole(role)).toBe(true);
      }
    });

    it('returns false for MEMBER and GUEST', () => {
      expect(isStaffRole('MEMBER')).toBe(false);
      expect(isStaffRole('GUEST')).toBe(false);
    });
  });
});
