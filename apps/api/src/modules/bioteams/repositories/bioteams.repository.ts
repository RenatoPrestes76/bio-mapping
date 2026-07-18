import { Injectable } from '@nestjs/common';
import type {
  BioTeam,
  BioTeamMember,
  BioTeamEvent,
  TeamCategory,
  TeamVisibility,
  TeamMemberRole,
  TeamMemberStatus,
  TeamEventType,
} from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class BioTeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTeam(data: {
    name: string;
    description?: string;
    category: TeamCategory;
    visibility?: TeamVisibility;
    ownerId: string;
    coverImage?: string;
    logo?: string;
    inviteCode?: string;
    maxMembers?: number;
    settings?: Record<string, unknown>;
  }): Promise<BioTeam> {
    return this.prisma.bioTeam.create({ data });
  }

  async findById(id: string): Promise<BioTeam | null> {
    return this.prisma.bioTeam.findUnique({ where: { id } });
  }

  async findByInviteCode(inviteCode: string): Promise<BioTeam | null> {
    return this.prisma.bioTeam.findUnique({ where: { inviteCode } });
  }

  async updateTeam(id: string, data: Partial<{
    name: string;
    description: string;
    visibility: TeamVisibility;
    coverImage: string;
    logo: string;
    maxMembers: number;
    settings: Record<string, unknown>;
  }>): Promise<BioTeam> {
    return this.prisma.bioTeam.update({ where: { id }, data });
  }

  async deleteTeam(id: string): Promise<BioTeam> {
    return this.prisma.bioTeam.delete({ where: { id } });
  }

  async createMember(data: { teamId: string; userId: string; role?: TeamMemberRole; status?: TeamMemberStatus }): Promise<BioTeamMember> {
    return this.prisma.bioTeamMember.create({ data });
  }

  async findMember(teamId: string, userId: string): Promise<BioTeamMember | null> {
    return this.prisma.bioTeamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  }

  async findMemberById(id: string): Promise<BioTeamMember | null> {
    return this.prisma.bioTeamMember.findUnique({ where: { id } });
  }

  async findTeamMembers(teamId: string, statuses?: TeamMemberStatus[]): Promise<BioTeamMember[]> {
    return this.prisma.bioTeamMember.findMany({
      where: { teamId, ...(statuses ? { status: { in: statuses } } : {}) },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async findUserTeams(userId: string): Promise<BioTeamMember[]> {
    return this.prisma.bioTeamMember.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async updateMemberStatus(id: string, status: TeamMemberStatus, extra?: { joinedAt?: Date }): Promise<BioTeamMember> {
    return this.prisma.bioTeamMember.update({ where: { id }, data: { status, ...extra } });
  }

  async updateMemberRole(teamId: string, userId: string, role: TeamMemberRole): Promise<BioTeamMember> {
    return this.prisma.bioTeamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role },
    });
  }

  async countActiveMembers(teamId: string): Promise<number> {
    return this.prisma.bioTeamMember.count({ where: { teamId, status: 'ACTIVE' } });
  }

  async createEvent(data: {
    teamId: string;
    title: string;
    description?: string;
    eventType: TeamEventType;
    startDate: Date;
    endDate?: Date;
    location?: string;
    createdBy: string;
  }): Promise<BioTeamEvent> {
    return this.prisma.bioTeamEvent.create({ data });
  }

  async findEventById(id: string): Promise<BioTeamEvent | null> {
    return this.prisma.bioTeamEvent.findUnique({ where: { id } });
  }

  async findTeamEvents(teamId: string, upcoming?: boolean): Promise<BioTeamEvent[]> {
    return this.prisma.bioTeamEvent.findMany({
      where: { teamId, ...(upcoming ? { startDate: { gte: new Date() } } : {}) },
      orderBy: { startDate: upcoming ? 'asc' : 'desc' },
      take: 50,
    });
  }

  async updateEvent(id: string, data: Partial<{
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    location: string;
  }>): Promise<BioTeamEvent> {
    return this.prisma.bioTeamEvent.update({ where: { id }, data });
  }

  async deleteEvent(id: string): Promise<BioTeamEvent> {
    return this.prisma.bioTeamEvent.delete({ where: { id } });
  }

  async findMemberUserIds(teamId: string): Promise<string[]> {
    const members = await this.prisma.bioTeamMember.findMany({
      where: { teamId, status: 'ACTIVE' },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async findRecentChapters(userIds: string[], limit = 10): Promise<unknown[]> {
    return this.prisma.bioBookChapter.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
