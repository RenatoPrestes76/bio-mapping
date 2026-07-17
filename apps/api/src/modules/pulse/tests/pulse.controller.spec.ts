import { PulseController } from '../controllers/pulse.controller';

const mockDashboard = { getDashboard: jest.fn().mockResolvedValue({ healthScore: { today: 78 } }) };
const mockScore = {
  getLatest: jest.fn().mockResolvedValue({ overall: 78, date: new Date() }),
  getRange: jest.fn().mockResolvedValue([]),
};
const mockRecovery = {
  compute: jest.fn().mockResolvedValue({ score: 72, classification: 'BOA', recommendation: 'Moderado' }),
};
const mockLoad = {
  getLatest: jest.fn().mockResolvedValue({ atl: 30, ctl: 35, tsb: 5 }),
  getRange: jest.fn().mockResolvedValue([]),
};
const mockTrends = { computeTrends: jest.fn().mockResolvedValue([]) };
const mockAlerts = {
  getAlerts: jest.fn().mockResolvedValue([]),
  markRead: jest.fn().mockResolvedValue({ id: 'a1', isRead: true }),
};
const mockTimeline = { getTimeline: jest.fn().mockResolvedValue([]) };
const mockScheduler = { runAllForPatient: jest.fn().mockResolvedValue(undefined) };

const mockUser = { sub: 'user-1', patientId: 'patient-1', role: 'PATIENT' };

describe('PulseController', () => {
  let controller: PulseController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PulseController(
      mockDashboard as any,
      mockScore as any,
      mockRecovery as any,
      mockLoad as any,
      mockTrends as any,
      mockAlerts as any,
      mockTimeline as any,
      mockScheduler as any,
    );
  });

  describe('getDashboard', () => {
    it('calls dashboard service with patientId', async () => {
      const result = await controller.getDashboard(mockUser);
      expect(mockDashboard.getDashboard).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual({ healthScore: { today: 78 } });
    });
  });

  describe('getScore', () => {
    it('returns latest when no days param', async () => {
      const result = await controller.getScore(mockUser);
      expect(mockScore.getLatest).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual({ overall: 78, date: expect.any(Date) });
    });

    it('returns range when days param provided', async () => {
      await controller.getScore(mockUser, '7');
      expect(mockScore.getRange).toHaveBeenCalledWith('patient-1', 7);
    });
  });

  describe('getRecovery', () => {
    it('returns recovery result', async () => {
      const result = await controller.getRecovery(mockUser);
      expect(mockRecovery.compute).toHaveBeenCalledWith('patient-1');
      expect(result.classification).toBe('BOA');
    });
  });

  describe('getTrainingLoad', () => {
    it('returns latest load', async () => {
      const result = await controller.getTrainingLoad(mockUser);
      expect(mockLoad.getLatest).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual(expect.objectContaining({ atl: 30 }));
    });

    it('returns range with days param', async () => {
      await controller.getTrainingLoad(mockUser, '30');
      expect(mockLoad.getRange).toHaveBeenCalledWith('patient-1', 30);
    });
  });

  describe('getTrends', () => {
    it('uses default periods when none provided', async () => {
      await controller.getTrends(mockUser);
      expect(mockTrends.computeTrends).toHaveBeenCalledWith('patient-1', ['7d', '30d']);
    });

    it('parses comma-separated periods', async () => {
      await controller.getTrends(mockUser, '7d,90d');
      expect(mockTrends.computeTrends).toHaveBeenCalledWith('patient-1', ['7d', '90d']);
    });
  });

  describe('getAlerts', () => {
    it('passes unreadOnly=false by default', async () => {
      await controller.getAlerts(mockUser);
      expect(mockAlerts.getAlerts).toHaveBeenCalledWith('patient-1', false);
    });

    it('passes unreadOnly=true when query param is "true"', async () => {
      await controller.getAlerts(mockUser, 'true');
      expect(mockAlerts.getAlerts).toHaveBeenCalledWith('patient-1', true);
    });
  });

  describe('markAlertRead', () => {
    it('calls markRead with alert id', async () => {
      await controller.markAlertRead('alert-123');
      expect(mockAlerts.markRead).toHaveBeenCalledWith('alert-123');
    });
  });

  describe('getTimeline', () => {
    it('calls timeline with patientId and defaults', async () => {
      await controller.getTimeline(mockUser);
      expect(mockTimeline.getTimeline).toHaveBeenCalledWith('patient-1', undefined, undefined, 50);
    });

    it('parses since/until and limit params', async () => {
      await controller.getTimeline(mockUser, '2025-01-01', '2025-01-31', '20');
      expect(mockTimeline.getTimeline).toHaveBeenCalledWith(
        'patient-1',
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        20,
      );
    });
  });

  describe('triggerCompute', () => {
    it('calls scheduler.runAllForPatient', async () => {
      const result = await controller.triggerCompute(mockUser);
      expect(mockScheduler.runAllForPatient).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual({ message: 'Computation triggered successfully' });
    });
  });
});
