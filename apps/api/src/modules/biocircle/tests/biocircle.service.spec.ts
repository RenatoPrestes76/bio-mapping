import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BioCircleService } from '../services/biocircle.service.js';

const CONNECTION_PENDING = {
  id: 'c1', requesterId: 'u1', receiverId: 'u2',
  relationshipType: 'FRIEND', status: 'PENDING',
  tenantId: null, acceptedAt: null, createdAt: new Date(), updatedAt: new Date(),
};

const CONNECTION_ACCEPTED = { ...CONNECTION_PENDING, status: 'ACCEPTED', acceptedAt: new Date() };
const CONNECTION_BLOCKED  = { ...CONNECTION_PENDING, status: 'BLOCKED' };
const CONNECTION_REJECTED = { ...CONNECTION_PENDING, status: 'REJECTED' };

const mockRepo = {
  createConnection: jest.fn(),
  findByPair: jest.fn(),
  findByRequester: jest.fn(),
  findByReceiver: jest.fn(),
  findAccepted: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  findPrivacySettings: jest.fn(),
  upsertPrivacySettings: jest.fn(),
};

const mockNotifications = {
  create: jest.fn().mockResolvedValue(undefined),
  findByUser: jest.fn().mockResolvedValue([]),
  countUnread: jest.fn().mockResolvedValue(0),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
};

const mockPrisma = {
  user: { findMany: jest.fn().mockResolvedValue([]) },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('BioCircleService', () => {
  let service: BioCircleService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BioCircleService(
      mockRepo as never,
      mockNotifications as never,
      mockPrisma as never,
      mockAudit as never,
    );
  });

  describe('sendInvite', () => {
    it('throws when inviting yourself', async () => {
      await expect(service.sendInvite('u1', { receiverId: 'u1', relationshipType: 'FRIEND' as never }))
        .rejects.toThrow(ConflictException);
    });

    it('creates new connection', async () => {
      mockRepo.findByPair.mockResolvedValue(null);
      mockRepo.findPrivacySettings.mockResolvedValue(null);
      mockRepo.createConnection.mockResolvedValue(CONNECTION_PENDING);

      const result = await service.sendInvite('u1', { receiverId: 'u2', relationshipType: 'FRIEND' as never });
      expect(result.status).toBe('PENDING');
      expect(mockNotifications.create).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith('CONNECTION_REQUESTED', expect.any(Object));
    });

    it('throws when forward connection already PENDING', async () => {
      mockRepo.findByPair.mockImplementation((a: string, b: string) =>
        a === 'u1' && b === 'u2' ? Promise.resolve(CONNECTION_PENDING) : Promise.resolve(null)
      );
      await expect(service.sendInvite('u1', { receiverId: 'u2', relationshipType: 'FRIEND' as never }))
        .rejects.toThrow(ConflictException);
    });

    it('throws when reverse connection PENDING', async () => {
      mockRepo.findByPair.mockImplementation((a: string, b: string) =>
        a === 'u2' && b === 'u1' ? Promise.resolve(CONNECTION_PENDING) : Promise.resolve(null)
      );
      await expect(service.sendInvite('u1', { receiverId: 'u2', relationshipType: 'FRIEND' as never }))
        .rejects.toThrow(ConflictException);
    });

    it('throws when already ACCEPTED', async () => {
      mockRepo.findByPair.mockImplementation((a: string, b: string) =>
        a === 'u1' && b === 'u2' ? Promise.resolve(CONNECTION_ACCEPTED) : Promise.resolve(null)
      );
      await expect(service.sendInvite('u1', { receiverId: 'u2', relationshipType: 'FRIEND' as never }))
        .rejects.toThrow(ConflictException);
    });

    it('re-invites after REJECTED by updating to PENDING', async () => {
      mockRepo.findByPair.mockImplementation((a: string, b: string) =>
        a === 'u1' && b === 'u2' ? Promise.resolve(CONNECTION_REJECTED) : Promise.resolve(null)
      );
      mockRepo.updateStatus.mockResolvedValue({ ...CONNECTION_REJECTED, status: 'PENDING' });
      const result = await service.sendInvite('u1', { receiverId: 'u2', relationshipType: 'FRIEND' as never });
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('c1', 'PENDING');
      expect(result.status).toBe('PENDING');
    });

    it('throws FORBIDDEN when receiver blocks invites', async () => {
      mockRepo.findByPair.mockResolvedValue(null);
      mockRepo.findPrivacySettings.mockResolvedValue({ invitesFrom: 'NOBODY' });
      await expect(service.sendInvite('u1', { receiverId: 'u2', relationshipType: 'FRIEND' as never }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('accept', () => {
    it('accepts a pending invite', async () => {
      mockRepo.findById.mockResolvedValue(CONNECTION_PENDING);
      mockRepo.updateStatus.mockResolvedValue(CONNECTION_ACCEPTED);
      const result = await service.accept('c1', 'u2');
      expect(result.status).toBe('ACCEPTED');
      expect(mockAudit.log).toHaveBeenCalledWith('CONNECTION_ACCEPTED', expect.any(Object));
    });

    it('throws NotFoundException when connection missing', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.accept('bad', 'u2')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not receiver', async () => {
      mockRepo.findById.mockResolvedValue(CONNECTION_PENDING);
      await expect(service.accept('c1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when already accepted', async () => {
      mockRepo.findById.mockResolvedValue(CONNECTION_ACCEPTED);
      await expect(service.accept('c1', 'u2')).rejects.toThrow(ConflictException);
    });
  });

  describe('reject', () => {
    it('rejects a pending invite', async () => {
      mockRepo.findById.mockResolvedValue(CONNECTION_PENDING);
      mockRepo.updateStatus.mockResolvedValue({ ...CONNECTION_PENDING, status: 'REJECTED' });
      const result = await service.reject('c1', 'u2');
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('block', () => {
    it('blocks a connection', async () => {
      mockRepo.findById.mockResolvedValue(CONNECTION_ACCEPTED);
      mockRepo.updateStatus.mockResolvedValue(CONNECTION_BLOCKED);
      const result = await service.block('c1', 'u1');
      expect(result.status).toBe('BLOCKED');
      expect(mockAudit.log).toHaveBeenCalledWith('CONNECTION_BLOCKED', expect.any(Object));
    });
  });

  describe('remove', () => {
    it('removes an accepted connection', async () => {
      mockRepo.findById.mockResolvedValue(CONNECTION_ACCEPTED);
      mockRepo.updateStatus.mockResolvedValue({ ...CONNECTION_ACCEPTED, status: 'REMOVED' });
      const result = await service.remove('c1', 'u1');
      expect(result.status).toBe('REMOVED');
    });

    it('throws ConflictException when removing non-accepted connection', async () => {
      mockRepo.findById.mockResolvedValue(CONNECTION_PENDING);
      await expect(service.remove('c1', 'u1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getDashboard', () => {
    it('returns aggregated stats', async () => {
      mockRepo.findAccepted.mockResolvedValue([CONNECTION_ACCEPTED, CONNECTION_ACCEPTED]);
      mockRepo.findByReceiver.mockResolvedValue([CONNECTION_PENDING]);
      mockRepo.findByRequester.mockResolvedValue([]);
      mockNotifications.countUnread.mockResolvedValue(3);

      const result = await service.getDashboard('u1');
      expect(result.acceptedCount).toBe(2);
      expect(result.pendingReceived).toBe(1);
      expect(result.pendingSent).toBe(0);
      expect(result.unreadNotifications).toBe(3);
    });
  });

  describe('updatePrivacySettings', () => {
    it('upserts settings and audits', async () => {
      const settings = { userId: 'u1', discoverableBy: 'EVERYONE' };
      mockRepo.upsertPrivacySettings.mockResolvedValue(settings);
      const result = await service.updatePrivacySettings('u1', { discoverableBy: 'EVERYONE' as never });
      expect(result).toEqual(settings);
      expect(mockAudit.log).toHaveBeenCalledWith('PRIVACY_UPDATED', expect.any(Object));
    });
  });
});
