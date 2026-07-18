import { NotFoundException } from '@nestjs/common';
import { StoryEngineService } from '../services/story-engine.service.js';

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
    it('returns chapter when found', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      const result = await service.findById('c1');
      expect(result).toEqual(CHAPTER);
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates chapter and audits', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      const updated = { ...CHAPTER, title: 'Novo Título' };
      mockRepo.updateChapter.mockResolvedValue(updated);

      const result = await service.update('c1', { title: 'Novo Título' }, 'u1');
      expect(result.title).toBe('Novo Título');
      expect(mockAudit.log).toHaveBeenCalledWith('CHAPTER_UPDATED', expect.objectContaining({ userId: 'u1' }));
    });

    it('throws when chapter not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('bad', { title: 'x' }, 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('share', () => {
    it('creates share and audits', async () => {
      mockRepo.findById.mockResolvedValue(CHAPTER);
      const share = { id: 's1', chapterId: 'c1', sharedBy: 'u1', sharedWith: 'u2', message: null, createdAt: new Date() };
      mockRepo.createShare.mockResolvedValue(share);

      const result = await service.share('c1', { sharedWith: 'u2' }, 'u1');
      expect(result).toEqual(share);
      expect(mockAudit.log).toHaveBeenCalledWith('CHAPTER_SHARED', expect.objectContaining({ userId: 'u1' }));
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
