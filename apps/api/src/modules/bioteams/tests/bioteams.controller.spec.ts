import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BioTeamsController } from '../controllers/bioteams.controller.js';
import type { BioTeamsService } from '../services/bioteams.service.js';

const makeService = () => ({
  createTeam: jest.fn(),
  findMyTeams: jest.fn(),
  findTeamById: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  getMembers: jest.fn(),
  inviteMember: jest.fn(),
  joinByCode: jest.fn(),
  acceptInvite: jest.fn(),
  removeMember: jest.fn(),
  updateMemberRole: jest.fn(),
  getEvents: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  getDashboard: jest.fn(),
  getMural: jest.fn(),
  generateChapterForEvent: jest.fn(),
});

const USER = { sub: 'u1' };

describe('BioTeamsController', () => {
  let controller: BioTeamsController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new BioTeamsController(service as unknown as BioTeamsService);
  });

  it('createTeam delegates to service', () => {
    (service.createTeam as jest.Mock).mockResolvedValue({ id: 't1' });
    controller.createTeam({ name: 'Alpha', category: 'GYM' }, USER);
    expect(service.createTeam).toHaveBeenCalledWith({ name: 'Alpha', category: 'GYM' }, 'u1');
  });

  it('getMyTeams delegates to service', () => {
    controller.getMyTeams(USER);
    expect(service.findMyTeams).toHaveBeenCalledWith('u1');
  });

  it('getTeam delegates to service', () => {
    controller.getTeam('t1', USER);
    expect(service.findTeamById).toHaveBeenCalledWith('t1', 'u1');
  });

  it('updateTeam delegates to service', () => {
    controller.updateTeam('t1', { name: 'Beta' }, USER);
    expect(service.updateTeam).toHaveBeenCalledWith('t1', { name: 'Beta' }, 'u1');
  });

  it('deleteTeam delegates to service', () => {
    controller.deleteTeam('t1', USER);
    expect(service.deleteTeam).toHaveBeenCalledWith('t1', 'u1');
  });

  it('getMembers delegates to service', () => {
    controller.getMembers('t1', USER);
    expect(service.getMembers).toHaveBeenCalledWith('t1', 'u1');
  });

  it('inviteMember delegates to service', () => {
    controller.inviteMember('t1', { userId: 'u2' }, USER);
    expect(service.inviteMember).toHaveBeenCalledWith('t1', { userId: 'u2' }, 'u1');
  });

  it('joinByCode delegates with code from body', () => {
    controller.joinByCode('t1', 'XYZ123', USER);
    expect(service.joinByCode).toHaveBeenCalledWith('XYZ123', 'u1');
  });

  it('acceptInvite delegates to service', () => {
    controller.acceptInvite('t1', USER);
    expect(service.acceptInvite).toHaveBeenCalledWith('t1', 'u1');
  });

  it('removeMember delegates to service', () => {
    controller.removeMember('t1', 'u2', USER);
    expect(service.removeMember).toHaveBeenCalledWith('t1', 'u2', 'u1');
  });

  it('updateMemberRole delegates to service', () => {
    controller.updateMemberRole('t1', 'u2', { role: 'COACH' }, USER);
    expect(service.updateMemberRole).toHaveBeenCalledWith('t1', { role: 'COACH' }, 'u2', 'u1');
  });

  it('getEvents delegates with upcoming flag', () => {
    controller.getEvents('t1', 'true', USER);
    expect(service.getEvents).toHaveBeenCalledWith('t1', 'u1', true);
  });

  it('createEvent delegates to service', () => {
    const dto = { title: 'Race', eventType: 'COMPETITION', startDate: '2026-09-01T10:00:00Z' };
    controller.createEvent('t1', dto, USER);
    expect(service.createEvent).toHaveBeenCalledWith('t1', dto, 'u1');
  });

  it('getDashboard delegates to service', () => {
    controller.getDashboard('t1', USER);
    expect(service.getDashboard).toHaveBeenCalledWith('t1', 'u1');
  });

  it('getMural delegates to service', () => {
    controller.getMural('t1', USER);
    expect(service.getMural).toHaveBeenCalledWith('t1', 'u1');
  });
});
