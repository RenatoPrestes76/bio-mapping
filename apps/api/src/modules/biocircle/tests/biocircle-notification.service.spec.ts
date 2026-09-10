import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BioCircleNotificationService } from '../notifications/biocircle-notification.service.js';

function makePrisma() {
  return {
    bioCircleNotification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

describe('BioCircleNotificationService', () => {
  let service: BioCircleNotificationService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new BioCircleNotificationService(prisma as never);
  });

  describe('markRead', () => {
    it('marks the notification read when the actor owns it', async () => {
      prisma.bioCircleNotification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1', read: false });
      prisma.bioCircleNotification.update.mockResolvedValue({ id: 'n1', userId: 'u1', read: true });

      const result = await service.markRead('n1', 'u1');
      expect(result.read).toBe(true);
      expect(prisma.bioCircleNotification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { read: true } });
    });

    it('throws NotFoundException when the notification does not exist', async () => {
      prisma.bioCircleNotification.findUnique.mockResolvedValue(null);
      await expect(service.markRead('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): a different user cannot mark someone else\'s notification as read', async () => {
      prisma.bioCircleNotification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1', read: false });
      await expect(service.markRead('n1', 'u2')).rejects.toThrow(ForbiddenException);
      expect(prisma.bioCircleNotification.update).not.toHaveBeenCalled();
    });
  });
});
