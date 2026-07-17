import { RecommendationService } from '../services/recommendation.service';
import { WellnessInsightCategory, InsightPriority, RecommendationStatus } from '@bio/database';
import { InsightCandidate } from '../services/insight-engine.service';

function makeRepo() {
  return {
    existsPending: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockResolvedValue({ id: 'r1' }),
    findByStatus: jest.fn().mockResolvedValue([]),
    findHistory: jest.fn().mockResolvedValue([]),
    updateStatus: jest.fn().mockResolvedValue({ id: 'r1', status: RecommendationStatus.ACCEPTED }),
  };
}

function makeInsight(insightType: string, priority = InsightPriority.IMPORTANTE): InsightCandidate {
  return {
    category: WellnessInsightCategory.SLEEP,
    priority,
    insightType,
    title: 'Test insight',
    message: 'Test message about the insight',
    metrics: ['sleepMinutes'],
    algorithm: 'test-v1',
    dataWindow: 14,
  };
}

describe('RecommendationService', () => {
  let service: RecommendationService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    repo = makeRepo();
    service = new RecommendationService(repo as any);
  });

  describe('generateFromInsights', () => {
    it('creates recommendation for known insight type', async () => {
      const count = await service.generateFromInsights('p1', [makeInsight('SLEEP_DECLINE_SIGNIFICANT')]);
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(count).toBe(1);
    });

    it('skips unknown insight types', async () => {
      const count = await service.generateFromInsights('p1', [makeInsight('UNKNOWN_TYPE')]);
      expect(repo.create).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });

    it('skips if same title already pending (dedup)', async () => {
      repo.existsPending.mockResolvedValue(true);
      const count = await service.generateFromInsights('p1', [makeInsight('SLEEP_DECLINE_SIGNIFICANT')]);
      expect(repo.create).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });

    it('creates recommendation for TRAINING_OVERLOAD_CRITICAL with ALTA_PRIORIDADE', async () => {
      await service.generateFromInsights('p1', [makeInsight('TRAINING_OVERLOAD_CRITICAL', InsightPriority.ALTA_PRIORIDADE)]);
      const call = (repo.create as jest.Mock).mock.calls[0];
      expect(call[1].priority).toBe(InsightPriority.ALTA_PRIORIDADE);
    });

    it('creates recommendations for multiple insights in one call', async () => {
      const insights = [
        makeInsight('SLEEP_DECLINE_SIGNIFICANT'),
        makeInsight('ACTIVITY_DROP', InsightPriority.ATENCAO),
      ];
      const count = await service.generateFromInsights('p1', insights);
      expect(count).toBe(2);
    });

    it('includes insightId in recommendation when idMap is provided', async () => {
      const idMap = new Map([['SLEEP_DECLINE_SIGNIFICANT', 'insight-123']]);
      await service.generateFromInsights('p1', [makeInsight('SLEEP_DECLINE_SIGNIFICANT')], idMap);
      const call = (repo.create as jest.Mock).mock.calls[0];
      expect(call[1].insightId).toBe('insight-123');
    });
  });

  describe('getRecommendations', () => {
    it('calls repo with patientId and optional status', async () => {
      await service.getRecommendations('p1', RecommendationStatus.PENDING);
      expect(repo.findByStatus).toHaveBeenCalledWith('p1', RecommendationStatus.PENDING);
    });

    it('calls repo without status filter when not provided', async () => {
      await service.getRecommendations('p1');
      expect(repo.findByStatus).toHaveBeenCalledWith('p1', undefined);
    });
  });

  describe('updateStatus', () => {
    it('calls repo updateStatus with id and new status', async () => {
      await service.updateStatus('r1', RecommendationStatus.ACCEPTED);
      expect(repo.updateStatus).toHaveBeenCalledWith('r1', RecommendationStatus.ACCEPTED);
    });
  });

  describe('getHistory', () => {
    it('calls repo findHistory with default limit', async () => {
      await service.getHistory('p1');
      expect(repo.findHistory).toHaveBeenCalledWith('p1', 30);
    });
  });

  describe('getTemplate', () => {
    it('returns template for known type', () => {
      const template = service.getTemplate('HR_ELEVATION');
      expect(template).toBeDefined();
      expect(template!.priority).toBe(InsightPriority.IMPORTANTE);
    });

    it('returns undefined for unknown type', () => {
      expect(service.getTemplate('NONEXISTENT')).toBeUndefined();
    });
  });
});
