import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StoryEngineService } from '../services/story-engine.service.js';

const OWNER = { sub: 'u1', role: 'PATIENT' };
const OTHER = { sub: 'u2', role: 'PATIENT' };
const ADMIN = { sub: 'admin-1', role: 'ADMIN' };

const CHAPTER = {
  id: 'c1',
  userId: 'u1',
  title: 'O Início da Jornada',
  chapterType: 'FIRST_ASSESSMENT',
  summary: 'Marco inicial.',
  startDate: new Date('2025-01-01'),
  endDate: null,
  metadata: { generationKey: 'u1:FIRST_ASSESSMENT' },
  tenantId: null,
  subtitle: null,
  coverImage: null,
  createdBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepo = {
  findByUser: jest.fn(),
  findById: jest.fn(),
  createChapter: jest.fn(),
  updateChapter: jest.fn(),
  createShare: jest.fn(),
  findSharedWith: jest.fn(),
};

const mockPrisma = {
  clinicalDecision: { findMany: jest.fn().mockResolvedValue([]) },
  clinicalPathway: { findMany: jest.fn().mockResolvedValue([]) },
  patientTimelineEvent: { findMany: jest.fn().mockResolvedValue([]) },
  clinicalTrend: { findMany: jest.fn().mockResolvedValue([]) },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('StoryEngineService', () => {
  let service: StoryEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StoryEngineService(mockRepo as never, mockPrisma as never, mockAudit as never);
  });

  describe('generate', () => {
    it('returns empty array and audits when no source data', async () => {
      mockRepo.findByUser.mockResolvedValue([]);
      const result = await service.generate('u1', 'u1');
      expect(result).toHaveLength(0);
      expect(mockAudit.log).toHaveBeenCalledWith('CHAPTER_GENERATED', expect.objectContaining({ userId: 'u1' }));
    });

    it('creates FIRST_ASSESSMENT when decisions exist', async () => {
      const decision = { id: 'd1', priority: 'HIGH', status: 'OPEN', createdAt: new Date('2025-01-15'), ruleId: 'R1' };
      mockPrisma.clinicalDecision.findMany.mockResolvedValue([decision]);
      mockRepo.findByUser.mockResolvedValue([]);
      mockRepo.createChapter.mockResolvedValue(CHAPTER);

      const result = await service.generate('u1', 'u1');
      expect(mockRepo.createChapter).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('skips duplicate chapters via generationKey', async () => {
      const decision = { id: 'd1', priority: 'HIGH', status: 'OPEN', createdAt: new Date('2025-01-15'), ruleId: 'R1' };
      mockPrisma.clinicalDecision.findMany.mockResolvedValue([decision]);
      // Existing chapter already has FIRST_ASSESSMENT key
      mockRepo.findByUser.mockResolvedValue([CHAPTER]);
      mockRepo.createChapter.mockResolvedValue(CHAPTER);

      const result = await service.generate('u1', 'u1');
      expect(mockRepo.createChapter).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('returns chapter when found for its owner', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      const result = await service.findById('c1', OWNER);
      expect(result).toEqual(CHAPTER);
    });

    it('returns chapter to ADMIN regardless of ownership', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      const result = await service.findById('c1', ADMIN);
      expect(result).toEqual(CHAPTER);
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent', OWNER)).rejects.toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): throws ForbiddenException when a different user requests it', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      await expect(service.findById('c1', OTHER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('updates chapter and audits', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      const updated = { ...CHAPTER, title: 'Novo Título' };
      mockRepo.updateChapter.mockResolvedValue(updated);

      const result = await service.update('c1', { title: 'Novo Título' }, OWNER);
      expect(result.title).toBe('Novo Título');
      expect(mockAudit.log).toHaveBeenCalledWith('CHAPTER_UPDATED', expect.objectContaining({ userId: 'u1' }));
    });

    it('throws when chapter not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('bad', { title: 'x' }, OWNER)).rejects.toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): a different user cannot update someone else\'s chapter', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      await expect(service.update('c1', { title: 'Hacked' }, OTHER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.updateChapter).not.toHaveBeenCalled();
    });
  });

  describe('share', () => {
    it('creates share and audits', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      const share = { id: 's1', chapterId: 'c1', sharedBy: 'u1', sharedWith: 'u2', message: null, createdAt: new Date() };
      mockRepo.createShare.mockResolvedValue(share);

      const result = await service.share('c1', { sharedWith: 'u2' }, OWNER);
      expect(result).toEqual(share);
      expect(mockAudit.log).toHaveBeenCalledWith('CHAPTER_SHARED', expect.objectContaining({ userId: 'u1' }));
    });

    it('SECURITY (IDOR): a different user cannot share someone else\'s chapter', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      await expect(service.share('c1', { sharedWith: 'u3' }, OTHER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.createShare).not.toHaveBeenCalled();
    });
  });

  describe('getTimeline', () => {
    it('returns empty array when no chapters', async () => {
      mockRepo.findByUser.mockResolvedValue([]);
      const result = await service.getTimeline('u1');
      expect(result).toHaveLength(0);
      expect(mockPrisma.patientTimelineEvent.findMany).not.toHaveBeenCalled();
    });

    it('groups events under correct chapters', async () => {
      mockRepo.findByUser.mockResolvedValue([CHAPTER]);
      const event = {
        id: 'e1', eventType: 'INSIGHT_GENERATED', severity: 'LOW', title: 'Insight',
        description: null, occurredAt: new Date('2025-01-10'), sourceTable: 'health_insights',
      };
      mockPrisma.patientTimelineEvent.findMany.mockResolvedValue([event]);

      const result = await service.getTimeline('u1');
      expect(result).toHaveLength(1);
      expect(result[0].chapter.id).toBe('c1');
      expect(result[0].events).toHaveLength(1);
    });
  });
});
