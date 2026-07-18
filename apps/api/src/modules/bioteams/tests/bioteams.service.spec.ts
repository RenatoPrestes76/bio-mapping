import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BioTeamsService } from '../services/bioteams.service.js';
import type { BioTeamsRepository } from '../repositories/bioteams.repository.js';
import type { AuditLogService } from '../../../common/audit/audit-log.service.js';

const makeRepo = () => ({
  createTeam: jest.fn(),
  findById: jest.fn(),
  findByInviteCode: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  createMember: jest.fn(),
  findMember: jest.fn(),
  findMemberById: jest.fn(),
  findTeamMembers: jest.fn(),
  findUserTeams: jest.fn(),
  updateMemberStatus: jest.fn(),
  updateMemberRole: jest.fn(),
  countActiveMembers: jest.fn(),
  createEvent: jest.fn(),
  findEventById: jest.fn(),
  findTeamEvents: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  findMemberUserIds: jest.fn(),
  findRecentChapters: jest.fn(),
});

const makeAudit = () => ({ log: jest.fn() });

const OWNER_MEMBER = { id: 'm1', teamId: 't1', userId: 'u1', role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() };
const ADMIN_MEMBER = { id: 'm2', teamId: 't1', userId: 'u2', role: 'ADMINISTRATOR', status: 'ACTIVE', joinedAt: new Date() };
const PLAIN_MEMBER = { id: 'm3', teamId: 't1', userId: 'u3', role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() };
const TEAM = { id: 't1', name: 'Alpha', visibility: 'INVITE_ONLY', ownerId: 'u1', maxMembers: null, inviteCode: 'XYZ123' };

describe('BioTeamsService', () => {
  let service: BioTeamsService;
  let repo: ReturnType<typeof makeRepo>;
  let audit: ReturnType<typeof makeAudit>;

  beforeEach(() => {
    repo = makeRepo();
    audit = makeAudit();
    service = new BioTeamsService(repo as unknown as BioTeamsRepository, audit as unknown as AuditLogService);
  });

  describe('createTeam', () => {
    it('creates team and adds owner as ACTIVE OWNER member', async () => {
      const team = { ...TEAM, id: 't1' };
      (repo.createTeam as jest.Mock).mockResolvedValue(team);
      (repo.createMember as jest.Mock).mockResolvedValue(OWNER_MEMBER);

      const result = await service.createTeam({ name: 'Alpha', category: 'GYM' }, 'u1');
      expect(result).toEqual(team);
      expect(repo.createMember).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', role: 'OWNER', status: 'ACTIVE' }),
      );
      expect(audit.log).toHaveBeenCalledWith('TEAM_CREATED', expect.any(Object));
    });
  });

  describe('findTeamById', () => {
    it('returns team for active member', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(TEAM);
      (repo.findMember as jest.Mock).mockResolvedValue(OWNER_MEMBER);
      const result = await service.findTeamById('t1', 'u1');
      expect(result).toEqual(TEAM);
    });

    it('throws NotFoundException when team not found', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.findTeamById('t1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for non-member on private team', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(TEAM);
      (repo.findMember as jest.Mock).mockResolvedValue(null);
      await expect(service.findTeamById('t1', 'u9')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('inviteMember', () => {
    beforeEach(() => {
      (repo.findById as jest.Mock).mockResolvedValue(TEAM);
      (repo.findMember as jest.Mock).mockImplementation((_teamId: unknown, userId: unknown) =>
        userId === 'u2' ? ADMIN_MEMBER : null,
      );
      (repo.countActiveMembers as jest.Mock).mockResolvedValue(2);
      (repo.createMember as jest.Mock).mockResolvedValue({ id: 'm4', teamId: 't1', userId: 'u9', role: 'MEMBER', status: 'PENDING' });
    });

    it('creates pending member when invited by admin', async () => {
      const result = await service.inviteMember('t1', { userId: 'u9' }, 'u2');
      expect(result).toMatchObject({ userId: 'u9', status: 'PENDING' });
    });

    it('throws ConflictException when member already exists', async () => {
      (repo.findMember as jest.Mock).mockImplementation((_: unknown, userId: unknown) => {
        if (userId === 'u2') return ADMIN_MEMBER;
        return { ...PLAIN_MEMBER, userId: 'u9', status: 'ACTIVE' };
      });
      await expect(service.inviteMember('t1', { userId: 'u9' }, 'u2')).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when requester is MEMBER role', async () => {
      (repo.findMember as jest.Mock).mockImplementation((_: unknown, userId: unknown) =>
        userId === 'u3' ? PLAIN_MEMBER : null,
      );
      await expect(service.inviteMember('t1', { userId: 'u9' }, 'u3')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('acceptInvite', () => {
    it('activates pending member', async () => {
      const pending = { id: 'm4', status: 'PENDING', teamId: 't1', userId: 'u9' };
      (repo.findMember as jest.Mock).mockResolvedValue(pending);
      (repo.updateMemberStatus as jest.Mock).mockResolvedValue({ ...pending, status: 'ACTIVE' });
      const result = await service.acceptInvite('t1', 'u9');
      expect(result).toMatchObject({ status: 'ACTIVE' });
    });

    it('throws NotFoundException when no pending invite', async () => {
      (repo.findMember as jest.Mock).mockResolvedValue(null);
      await expect(service.acceptInvite('t1', 'u9')).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinByCode', () => {
    it('adds member when invite code is valid', async () => {
      (repo.findByInviteCode as jest.Mock).mockResolvedValue(TEAM);
      (repo.countActiveMembers as jest.Mock).mockResolvedValue(1);
      (repo.findMember as jest.Mock).mockResolvedValue(null);
      (repo.createMember as jest.Mock).mockResolvedValue(PLAIN_MEMBER);
      const result = await service.joinByCode('XYZ123', 'u3');
      expect(result).toEqual(PLAIN_MEMBER);
    });

    it('throws NotFoundException for invalid code', async () => {
      (repo.findByInviteCode as jest.Mock).mockResolvedValue(null);
      await expect(service.joinByCode('WRONG', 'u3')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for PRIVATE team', async () => {
      (repo.findByInviteCode as jest.Mock).mockResolvedValue({ ...TEAM, visibility: 'PRIVATE' });
      await expect(service.joinByCode('XYZ123', 'u3')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('removes non-owner member', async () => {
      (repo.findMember as jest.Mock).mockImplementation((_: unknown, userId: unknown) =>
        userId === 'u1' ? OWNER_MEMBER : PLAIN_MEMBER,
      );
      (repo.updateMemberStatus as jest.Mock).mockResolvedValue({ ...PLAIN_MEMBER, status: 'REMOVED' });
      await service.removeMember('t1', 'u3', 'u1');
      expect(repo.updateMemberStatus).toHaveBeenCalledWith(PLAIN_MEMBER.id, 'REMOVED');
    });

    it('throws ForbiddenException when trying to remove OWNER', async () => {
      (repo.findMember as jest.Mock).mockImplementation((_: unknown, userId: unknown) =>
        userId === 'u1' ? OWNER_MEMBER : { ...OWNER_MEMBER, userId: 'u1', role: 'OWNER' },
      );
      await expect(service.removeMember('t1', 'u1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createEvent', () => {
    it('creates event for staff member', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(TEAM);
      (repo.findMember as jest.Mock).mockResolvedValue(OWNER_MEMBER);
      const event = { id: 'e1', title: 'Training', teamId: 't1' };
      (repo.createEvent as jest.Mock).mockResolvedValue(event);
      const result = await service.createEvent('t1', {
        title: 'Training', eventType: 'TRAINING', startDate: '2026-09-01T10:00:00Z',
      }, 'u1');
      expect(result).toEqual(event);
      expect(audit.log).toHaveBeenCalledWith('TEAM_EVENT_CREATED', expect.any(Object));
    });

    it('throws ForbiddenException for MEMBER role creating event', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(TEAM);
      (repo.findMember as jest.Mock).mockResolvedValue(PLAIN_MEMBER);
      await expect(service.createEvent('t1', {
        title: 'Training', eventType: 'TRAINING', startDate: '2026-09-01T10:00:00Z',
      }, 'u3')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTeam', () => {
    it('allows owner to delete team', async () => {
      (repo.findMember as jest.Mock).mockResolvedValue(OWNER_MEMBER);
      (repo.deleteTeam as jest.Mock).mockResolvedValue(TEAM);
      await service.deleteTeam('t1', 'u1');
      expect(repo.deleteTeam).toHaveBeenCalledWith('t1');
    });

    it('throws ForbiddenException for admin trying to delete', async () => {
      (repo.findMember as jest.Mock).mockResolvedValue(ADMIN_MEMBER);
      await expect(service.deleteTeam('t1', 'u2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDashboard', () => {
    it('returns aggregated team data', async () => {
      (repo.findById as jest.Mock).mockResolvedValue(TEAM);
      (repo.findMember as jest.Mock).mockResolvedValue(OWNER_MEMBER);
      (repo.findTeamMembers as jest.Mock).mockResolvedValue([OWNER_MEMBER, PLAIN_MEMBER]);
      (repo.findTeamEvents as jest.Mock).mockResolvedValue([]);
      (repo.countActiveMembers as jest.Mock).mockResolvedValue(2);

      const result = await service.getDashboard('t1', 'u1');
      expect(result).toMatchObject({ memberCount: 2, myRole: 'OWNER' });
    });
  });
});
