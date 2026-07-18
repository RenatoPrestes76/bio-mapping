import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BioTeamsRepository } from '../repositories/bioteams.repository.js';
import type { PrismaService } from '../../../database/prisma.service.js';

const makePrisma = () => ({
  bioTeam: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  bioTeamMember: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  bioTeamEvent: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  bioBookChapter: {
    findMany: jest.fn(),
  },
});

describe('BioTeamsRepository', () => {
  let repo: BioTeamsRepository;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new BioTeamsRepository(prisma as unknown as PrismaService);
  });

  it('createTeam calls prisma.bioTeam.create', async () => {
    const team = { id: 't1', name: 'Team A' };
    (prisma.bioTeam.create as jest.Mock).mockResolvedValue(team);
    const result = await repo.createTeam({ name: 'Team A', category: 'GYM', ownerId: 'u1' });
    expect(result).toEqual(team);
    expect(prisma.bioTeam.create).toHaveBeenCalled();
  });

  it('findById returns team', async () => {
    const team = { id: 't1' };
    (prisma.bioTeam.findUnique as jest.Mock).mockResolvedValue(team);
    const result = await repo.findById('t1');
    expect(result).toEqual(team);
  });

  it('findByInviteCode returns team', async () => {
    const team = { id: 't1', inviteCode: 'ABC123' };
    (prisma.bioTeam.findUnique as jest.Mock).mockResolvedValue(team);
    const result = await repo.findByInviteCode('ABC123');
    expect(result).toEqual(team);
  });

  it('createMember calls prisma.bioTeamMember.create', async () => {
    const member = { id: 'm1', teamId: 't1', userId: 'u1' };
    (prisma.bioTeamMember.create as jest.Mock).mockResolvedValue(member);
    const result = await repo.createMember({ teamId: 't1', userId: 'u1', role: 'MEMBER', status: 'PENDING' });
    expect(result).toEqual(member);
  });

  it('findMember uses composite unique key', async () => {
    const member = { id: 'm1' };
    (prisma.bioTeamMember.findUnique as jest.Mock).mockResolvedValue(member);
    const result = await repo.findMember('t1', 'u1');
    expect(result).toEqual(member);
    expect(prisma.bioTeamMember.findUnique).toHaveBeenCalledWith({
      where: { teamId_userId: { teamId: 't1', userId: 'u1' } },
    });
  });

  it('countActiveMembers filters by ACTIVE status', async () => {
    (prisma.bioTeamMember.count as jest.Mock).mockResolvedValue(5);
    const count = await repo.countActiveMembers('t1');
    expect(count).toBe(5);
    expect(prisma.bioTeamMember.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
  });

  it('createEvent creates event with all fields', async () => {
    const event = { id: 'e1', teamId: 't1' };
    (prisma.bioTeamEvent.create as jest.Mock).mockResolvedValue(event);
    const result = await repo.createEvent({
      teamId: 't1', title: 'Training Day', eventType: 'TRAINING',
      startDate: new Date('2026-08-01T12:00:00Z'), createdBy: 'u1',
    });
    expect(result).toEqual(event);
  });

  it('findMemberUserIds returns userId array from ACTIVE members', async () => {
    (prisma.bioTeamMember.findMany as jest.Mock).mockResolvedValue([
      { userId: 'u1' }, { userId: 'u2' },
    ]);
    const ids = await repo.findMemberUserIds('t1');
    expect(ids).toEqual(['u1', 'u2']);
  });
});
