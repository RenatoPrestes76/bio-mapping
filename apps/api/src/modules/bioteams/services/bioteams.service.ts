import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { BioTeam, BioTeamEvent, BioTeamMember, TeamEventType, TeamMemberRole } from '@bio/database';
import { BioTeamsRepository } from '../repositories/bioteams.repository.js';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { canManageTeam, canInviteMembers, canManageEvents, canManageMembers, canTransferOwnership } from '../permissions/bioteams.permissions.js';
import type { CreateTeamDto } from '../dto/create-team.dto.js';
import type { UpdateTeamDto } from '../dto/update-team.dto.js';
import type { InviteMemberDto } from '../dto/invite-member.dto.js';
import type { UpdateMemberRoleDto } from '../dto/update-member-role.dto.js';
import type { CreateEventDto } from '../dto/create-event.dto.js';

const EVENT_TO_CHAPTER_TYPE: Record<string, string> = {
  TRAINING: 'TRAINING_CYCLE',
  COMPETITION: 'COMPETITION',
  ASSESSMENT: 'FIRST_ASSESSMENT',
  CHALLENGE: 'CHALLENGE',
  CONSULTATION: 'MEDICAL_FOLLOW_UP',
  MEETING: 'MILESTONE',
};

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

@Injectable()
export class BioTeamsService {
  constructor(
    private readonly repository: BioTeamsRepository,
    private readonly audit: AuditLogService,
  ) {}

  async createTeam(dto: CreateTeamDto, ownerId: string): Promise<BioTeam> {
    const team = await this.repository.createTeam({
      name: dto.name,
      description: dto.description,
      category: dto.category as Parameters<typeof this.repository.createTeam>[0]['category'],
      visibility: (dto.visibility ?? 'INVITE_ONLY') as Parameters<typeof this.repository.createTeam>[0]['visibility'],
      ownerId,
      coverImage: dto.coverImage,
      logo: dto.logo,
      inviteCode: generateInviteCode(),
      maxMembers: dto.maxMembers,
      settings: dto.settings,
    });

    await this.repository.createMember({ teamId: team.id, userId: ownerId, role: 'OWNER', status: 'ACTIVE' });
    await this.audit.log('TEAM_CREATED', { userId: ownerId, metadata: { teamId: team.id, name: team.name } });

    return team;
  }

  async findMyTeams(userId: string): Promise<Array<{ team: BioTeam; member: BioTeamMember }>> {
    const memberships = await this.repository.findUserTeams(userId);
    const results: Array<{ team: BioTeam; member: BioTeamMember }> = [];

    for (const member of memberships) {
      const team = await this.repository.findById(member.teamId);
      if (team) results.push({ team, member });
    }

    return results;
  }

  async findTeamById(id: string, requesterId: string): Promise<BioTeam> {
    const team = await this.repository.findById(id);
    if (!team) throw new NotFoundException('Team not found');

    const member = await this.repository.findMember(id, requesterId);
    if (!member || member.status !== 'ACTIVE') {
      if (team.visibility !== 'PUBLIC') throw new ForbiddenException('Access denied');
    }

    return team;
  }

  async updateTeam(id: string, dto: UpdateTeamDto, userId: string): Promise<BioTeam> {
    await this.requireActiveMembership(id, userId, canManageTeam);
    const team = await this.repository.updateTeam(id, {
      name: dto.name,
      description: dto.description,
      visibility: dto.visibility as Parameters<typeof this.repository.updateTeam>[1]['visibility'],
      coverImage: dto.coverImage,
      logo: dto.logo,
      maxMembers: dto.maxMembers,
      settings: dto.settings,
    });
    await this.audit.log('TEAM_UPDATED', { userId, metadata: { teamId: id } });
    return team;
  }

  async deleteTeam(id: string, userId: string): Promise<void> {
    const member = await this.requireActiveMembership(id, userId, canManageTeam);
    if (member.role !== 'OWNER') throw new ForbiddenException('Only owner can delete team');
    await this.repository.deleteTeam(id);
    await this.audit.log('TEAM_DELETED', { userId, metadata: { teamId: id } });
  }

  async getMembers(teamId: string, requesterId: string): Promise<BioTeamMember[]> {
    await this.ensureTeamExists(teamId);
    const requesterMember = await this.repository.findMember(teamId, requesterId);
    if (!requesterMember || requesterMember.status !== 'ACTIVE') {
      throw new ForbiddenException('Access denied');
    }
    return this.repository.findTeamMembers(teamId, ['ACTIVE', 'PENDING', 'SUSPENDED']);
  }

  async inviteMember(teamId: string, dto: InviteMemberDto, invitedBy: string): Promise<BioTeamMember> {
    const team = await this.ensureTeamExists(teamId);
    await this.requireActiveMembership(teamId, invitedBy, canInviteMembers);

    if (team.maxMembers) {
      const count = await this.repository.countActiveMembers(teamId);
      if (count >= team.maxMembers) throw new ConflictException('Team is at maximum capacity');
    }

    const existing = await this.repository.findMember(teamId, dto.userId);
    if (existing) {
      if (existing.status === 'REMOVED') {
        return this.repository.updateMemberStatus(existing.id, 'PENDING');
      }
      throw new ConflictException('User is already a member or has a pending invite');
    }

    const role = (dto.role ?? 'MEMBER') as TeamMemberRole;
    const member = await this.repository.createMember({ teamId, userId: dto.userId, role, status: 'PENDING' });
    await this.audit.log('TEAM_MEMBER_INVITED', { userId: invitedBy, metadata: { teamId, invitedUserId: dto.userId, role } });

    return member;
  }

  async acceptInvite(teamId: string, userId: string): Promise<BioTeamMember> {
    const existing = await this.repository.findMember(teamId, userId);
    if (!existing || existing.status !== 'PENDING') throw new NotFoundException('Pending invite not found');
    const member = await this.repository.updateMemberStatus(existing.id, 'ACTIVE', { joinedAt: new Date() });
    await this.audit.log('TEAM_MEMBER_ACCEPTED', { userId, metadata: { teamId } });
    return member;
  }

  async removeMember(teamId: string, targetUserId: string, requesterId: string): Promise<void> {
    await this.requireActiveMembership(teamId, requesterId, canManageMembers);

    const target = await this.repository.findMember(teamId, targetUserId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot remove team owner');

    await this.repository.updateMemberStatus(target.id, 'REMOVED');
    await this.audit.log('TEAM_MEMBER_REMOVED', { userId: requesterId, metadata: { teamId, removedUserId: targetUserId } });
  }

  async updateMemberRole(teamId: string, dto: UpdateMemberRoleDto, targetUserId: string, requesterId: string): Promise<BioTeamMember> {
    const requesterMember = await this.requireActiveMembership(teamId, requesterId, canManageMembers);

    const target = await this.repository.findMember(teamId, targetUserId);
    if (!target || target.status !== 'ACTIVE') throw new NotFoundException('Member not found');
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot change owner role');
    if (dto.role === 'OWNER' && !canTransferOwnership(requesterMember.role as Parameters<typeof canTransferOwnership>[0])) {
      throw new ForbiddenException('Only owner can transfer ownership');
    }

    const member = await this.repository.updateMemberRole(teamId, targetUserId, dto.role as TeamMemberRole);
    await this.audit.log('TEAM_MEMBER_ROLE_UPDATED', { userId: requesterId, metadata: { teamId, targetUserId, newRole: dto.role } });
    return member;
  }

  async joinByCode(code: string, userId: string): Promise<BioTeamMember> {
    const team = await this.repository.findByInviteCode(code);
    if (!team) throw new NotFoundException('Invalid invite code');
    if (team.visibility === 'PRIVATE') throw new ForbiddenException('This team is private');

    if (team.maxMembers) {
      const count = await this.repository.countActiveMembers(team.id);
      if (count >= team.maxMembers) throw new ConflictException('Team is at maximum capacity');
    }

    const existing = await this.repository.findMember(team.id, userId);
    if (existing) {
      if (existing.status === 'ACTIVE') throw new ConflictException('Already a member');
      if (existing.status === 'SUSPENDED') throw new ForbiddenException('Your membership is suspended');
      return this.repository.updateMemberStatus(existing.id, 'ACTIVE', { joinedAt: new Date() });
    }

    const member = await this.repository.createMember({ teamId: team.id, userId, role: 'MEMBER', status: 'ACTIVE' });
    await this.audit.log('TEAM_MEMBER_ACCEPTED', { userId, metadata: { teamId: team.id, joinedByCode: true } });
    return member;
  }

  async createEvent(teamId: string, dto: CreateEventDto, userId: string): Promise<BioTeamEvent> {
    await this.ensureTeamExists(teamId);
    await this.requireActiveMembership(teamId, userId, canManageEvents);

    const event = await this.repository.createEvent({
      teamId,
      title: dto.title,
      description: dto.description,
      eventType: dto.eventType as TeamEventType,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      location: dto.location,
      createdBy: userId,
    });

    await this.audit.log('TEAM_EVENT_CREATED', { userId, metadata: { teamId, eventId: event.id, title: event.title } });
    return event;
  }

  async getEvents(teamId: string, requesterId: string, upcoming?: boolean): Promise<BioTeamEvent[]> {
    await this.findTeamById(teamId, requesterId);
    return this.repository.findTeamEvents(teamId, upcoming);
  }

  async updateEvent(teamId: string, eventId: string, dto: Partial<CreateEventDto>, userId: string): Promise<BioTeamEvent> {
    await this.requireActiveMembership(teamId, userId, canManageEvents);

    const event = await this.repository.findEventById(eventId);
    if (!event || event.teamId !== teamId) throw new NotFoundException('Event not found');

    const updated = await this.repository.updateEvent(eventId, {
      title: dto.title,
      description: dto.description,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      location: dto.location,
    });
    await this.audit.log('TEAM_EVENT_UPDATED', { userId, metadata: { teamId, eventId } });
    return updated;
  }

  async deleteEvent(teamId: string, eventId: string, userId: string): Promise<void> {
    await this.requireActiveMembership(teamId, userId, canManageEvents);
    const event = await this.repository.findEventById(eventId);
    if (!event || event.teamId !== teamId) throw new NotFoundException('Event not found');
    await this.repository.deleteEvent(eventId);
    await this.audit.log('TEAM_EVENT_DELETED', { userId, metadata: { teamId, eventId } });
  }

  async getDashboard(teamId: string, userId: string): Promise<{
    team: BioTeam;
    memberCount: number;
    recentMembers: BioTeamMember[];
    upcomingEvents: BioTeamEvent[];
    recentEvents: BioTeamEvent[];
    myRole: string;
  }> {
    const team = await this.findTeamById(teamId, userId);
    const [allMembers, upcomingEvents, recentEvents, memberCount] = await Promise.all([
      this.repository.findTeamMembers(teamId, ['ACTIVE']),
      this.repository.findTeamEvents(teamId, true),
      this.repository.findTeamEvents(teamId, false),
      this.repository.countActiveMembers(teamId),
    ]);

    const myMember = await this.repository.findMember(teamId, userId);
    const recentMembers = allMembers.slice(-5).reverse();

    return { team, memberCount, recentMembers, upcomingEvents: upcomingEvents.slice(0, 5), recentEvents: recentEvents.slice(0, 10), myRole: myMember?.role ?? 'MEMBER' };
  }

  async getMural(teamId: string, userId: string): Promise<{
    chapters: unknown[];
    events: BioTeamEvent[];
    recentJoins: BioTeamMember[];
  }> {
    await this.findTeamById(teamId, userId);
    const memberIds = await this.repository.findMemberUserIds(teamId);
    const [chapters, events, allMembers] = await Promise.all([
      this.repository.findRecentChapters(memberIds, 10),
      this.repository.findTeamEvents(teamId, false),
      this.repository.findTeamMembers(teamId, ['ACTIVE']),
    ]);

    const recentJoins = [...allMembers].sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()).slice(0, 5);

    return { chapters, events: events.slice(0, 5), recentJoins };
  }

  async generateChapterForEvent(teamId: string, eventId: string, userId: string): Promise<void> {
    await this.findTeamById(teamId, userId);
    const event = await this.repository.findEventById(eventId);
    if (!event || event.teamId !== teamId) throw new NotFoundException('Event not found');

    const chapterType = EVENT_TO_CHAPTER_TYPE[event.eventType] ?? 'MILESTONE';
    const generationKey = `${userId}:EVENT:${eventId}`;

    const existing = await this.repository.findRecentChapters([userId], 100) as Array<{ metadata?: { generationKey?: string } }>;
    const alreadyExists = existing.some((c) => (c.metadata as Record<string, unknown>)?.['generationKey'] === generationKey);
    if (alreadyExists) return;

    await this.audit.log('TEAM_CHAPTER_GENERATED', { userId, metadata: { teamId, eventId, chapterType } });
  }

  private async ensureTeamExists(teamId: string): Promise<BioTeam> {
    const team = await this.repository.findById(teamId);
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  private async requireActiveMembership(
    teamId: string,
    userId: string,
    permissionFn: (role: Parameters<typeof canManageTeam>[0]) => boolean,
  ): Promise<BioTeamMember> {
    const member = await this.repository.findMember(teamId, userId);
    if (!member || member.status !== 'ACTIVE') throw new ForbiddenException('Access denied');
    if (!permissionFn(member.role as Parameters<typeof canManageTeam>[0])) throw new ForbiddenException('Insufficient permissions');
    return member;
  }
}
