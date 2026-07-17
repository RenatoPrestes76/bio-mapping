import { AegisController } from '../controllers/aegis.controller';
import { GoalType, RecommendationStatus } from '@bio/database';

const mockInsightEngine = { generateInsights: jest.fn().mockResolvedValue(3) };
const mockRecommendations = {
  getRecommendations: jest.fn().mockResolvedValue([]),
  getHistory: jest.fn().mockResolvedValue([]),
  updateStatus: jest.fn().mockResolvedValue({ id: 'r1', status: RecommendationStatus.ACCEPTED }),
  generateFromInsights: jest.fn().mockResolvedValue(2),
};
const mockGoals = {
  getGoals: jest.fn().mockResolvedValue([]),
  setGoal: jest.fn().mockResolvedValue({ id: 'g1' }),
  evaluateProgress: jest.fn().mockResolvedValue([]),
  autoAdjustGoals: jest.fn().mockResolvedValue([]),
};
const mockPredictions = {
  getPredictions: jest.fn().mockResolvedValue([]),
  computePredictions: jest.fn().mockResolvedValue([]),
};
const mockDashboard = {
  getDashboard: jest.fn().mockResolvedValue({ insights: [], recommendations: [] }),
};
const mockScheduler = {
  runAllForPatient: jest.fn().mockResolvedValue({ insights: 2 }),
};
const mockInsightRepo = {
  findRecent: jest.fn().mockResolvedValue([]),
  markRead: jest.fn().mockResolvedValue({ id: 'i1', isRead: true }),
};

const mockUser = { sub: 'user-1', patientId: 'patient-1', role: 'PATIENT' };

describe('AegisController', () => {
  let controller: AegisController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AegisController(
      mockInsightEngine as any,
      mockRecommendations as any,
      mockGoals as any,
      mockPredictions as any,
      mockDashboard as any,
      mockScheduler as any,
      mockInsightRepo as any,
    );
  });

  describe('getDashboard', () => {
    it('calls dashboard service with patientId', async () => {
      await controller.getDashboard(mockUser);
      expect(mockDashboard.getDashboard).toHaveBeenCalledWith('patient-1');
    });
  });

  describe('getInsights', () => {
    it('calls repo with default limit 20', async () => {
      await controller.getInsights(mockUser);
      expect(mockInsightRepo.findRecent).toHaveBeenCalledWith('patient-1', 20);
    });

    it('parses limit query param', async () => {
      await controller.getInsights(mockUser, '5');
      expect(mockInsightRepo.findRecent).toHaveBeenCalledWith('patient-1', 5);
    });
  });

  describe('markInsightRead', () => {
    it('calls repo markRead with id', async () => {
      await controller.markInsightRead('insight-123');
      expect(mockInsightRepo.markRead).toHaveBeenCalledWith('insight-123');
    });
  });

  describe('getRecommendations', () => {
    it('passes status filter when provided', async () => {
      await controller.getRecommendations(mockUser, 'PENDING');
      expect(mockRecommendations.getRecommendations).toHaveBeenCalledWith('patient-1', 'PENDING');
    });

    it('passes undefined status when not provided', async () => {
      await controller.getRecommendations(mockUser);
      expect(mockRecommendations.getRecommendations).toHaveBeenCalledWith('patient-1', undefined);
    });
  });

  describe('updateRecommendation', () => {
    it('calls updateStatus with id and body status', async () => {
      await controller.updateRecommendation('r1', { status: RecommendationStatus.ACCEPTED });
      expect(mockRecommendations.updateStatus).toHaveBeenCalledWith('r1', RecommendationStatus.ACCEPTED);
    });
  });

  describe('getGoals', () => {
    it('calls goals service with patientId', async () => {
      await controller.getGoals(mockUser);
      expect(mockGoals.getGoals).toHaveBeenCalledWith('patient-1');
    });
  });

  describe('createGoal', () => {
    it('calls setGoal with correct params', async () => {
      await controller.createGoal(mockUser, { type: GoalType.DAILY_STEPS, target: 10000, notes: 'test' });
      expect(mockGoals.setGoal).toHaveBeenCalledWith('patient-1', GoalType.DAILY_STEPS, 10000, 'test');
    });
  });

  describe('getGoalProgress', () => {
    it('calls evaluateProgress', async () => {
      await controller.getGoalProgress(mockUser);
      expect(mockGoals.evaluateProgress).toHaveBeenCalledWith('patient-1');
    });
  });

  describe('getPredictions', () => {
    it('calls predictions service', async () => {
      await controller.getPredictions(mockUser);
      expect(mockPredictions.getPredictions).toHaveBeenCalledWith('patient-1');
    });
  });

  describe('getRecommendationHistory', () => {
    it('uses default limit 30', async () => {
      await controller.getRecommendationHistory(mockUser);
      expect(mockRecommendations.getHistory).toHaveBeenCalledWith('patient-1', 30);
    });

    it('parses limit param', async () => {
      await controller.getRecommendationHistory(mockUser, '10');
      expect(mockRecommendations.getHistory).toHaveBeenCalledWith('patient-1', 10);
    });
  });

  describe('triggerCompute', () => {
    it('calls scheduler and returns message', async () => {
      const result = await controller.triggerCompute(mockUser);
      expect(mockScheduler.runAllForPatient).toHaveBeenCalledWith('patient-1');
      expect(result.message).toContain('triggered');
    });
  });
});
