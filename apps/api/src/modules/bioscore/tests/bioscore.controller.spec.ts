import { Test, TestingModule } from '@nestjs/testing';
import { BioScoreController } from '../controllers/bioscore.controller.js';
import { BioScoreService } from '../services/bioscore.service.js';
import { SleepMetricsService } from '../services/sleep-metrics.service.js';
import { SportMetricsService } from '../services/sport-metrics.service.js';
import { RecoveryService } from '../services/recovery.service.js';
import { TrendsService } from '../services/trends.service.js';
import { AlertsService } from '../services/alerts.service.js';

const PATIENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockBioScoreService = {
  computeBioScore: jest.fn().mockResolvedValue({ id: '1', patientId: PATIENT_ID, healthScore: 75 }),
  findAll: jest.fn().mockResolvedValue([]),
  findLatest: jest.fn().mockResolvedValue({ id: '1', healthScore: 75 }),
  getDashboard: jest.fn().mockResolvedValue({ patientId: PATIENT_ID, generatedAt: new Date() }),
};

const mockSleepService = {
  create: jest.fn().mockResolvedValue({ id: 's1' }),
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue({ id: 's1' }),
  delete: jest.fn().mockResolvedValue(undefined),
};

const mockSportService = {
  create: jest.fn().mockResolvedValue({ id: 'sp1' }),
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue({ id: 'sp1' }),
  getActiveDaysLastWeek: jest.fn().mockResolvedValue(4),
  getTotalSessionsLastWeek: jest.fn().mockResolvedValue(5),
};

const mockRecoveryService = {
  findAll: jest.fn().mockResolvedValue([]),
  findLatest: jest.fn().mockResolvedValue({ recoveryScore: 72 }),
  getRecentScores: jest.fn().mockResolvedValue([]),
};

const mockTrendsService = {
  findAll: jest.fn().mockResolvedValue([]),
  computeForPatient: jest.fn().mockResolvedValue([]),
  findByMetric: jest.fn().mockResolvedValue([]),
};

const mockAlertsService = {
  findAll: jest.fn().mockResolvedValue([]),
  markRead: jest.fn().mockResolvedValue({ isRead: true }),
  resolve: jest.fn().mockResolvedValue({ isResolved: true }),
  evaluateAndCreate: jest.fn().mockResolvedValue(0),
};

describe('BioScoreController', () => {
  let controller: BioScoreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BioScoreController],
      providers: [
        { provide: BioScoreService, useValue: mockBioScoreService },
        { provide: SleepMetricsService, useValue: mockSleepService },
        { provide: SportMetricsService, useValue: mockSportService },
        { provide: RecoveryService, useValue: mockRecoveryService },
        { provide: TrendsService, useValue: mockTrendsService },
        { provide: AlertsService, useValue: mockAlertsService },
      ],
    }).compile();

    controller = module.get(BioScoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('computeBioScore', () => {
    it('delegates to BioScoreService.computeBioScore', async () => {
      const result = await controller.computeBioScore(PATIENT_ID);
      expect(mockBioScoreService.computeBioScore).toHaveBeenCalledWith(PATIENT_ID);
      expect(result).toHaveProperty('healthScore', 75);
    });
  });

  describe('findAllBioScore', () => {
    it('delegates to BioScoreService.findAll', async () => {
      await controller.findAllBioScore(PATIENT_ID);
      expect(mockBioScoreService.findAll).toHaveBeenCalledWith(PATIENT_ID);
    });
  });

  describe('findLatestBioScore', () => {
    it('returns latest bio score', async () => {
      const result = await controller.findLatestBioScore(PATIENT_ID);
      expect(result).toHaveProperty('healthScore', 75);
    });
  });

  describe('getDashboard', () => {
    it('delegates to BioScoreService.getDashboard', async () => {
      const result = await controller.getDashboard(PATIENT_ID);
      expect(mockBioScoreService.getDashboard).toHaveBeenCalledWith(PATIENT_ID);
      expect(result).toHaveProperty('patientId', PATIENT_ID);
    });
  });

  describe('createSleep', () => {
    it('delegates to SleepMetricsService.create', async () => {
      const dto = { date: '2025-07-10', totalMinutes: 430 } as any;
      await controller.createSleep(PATIENT_ID, dto);
      expect(mockSleepService.create).toHaveBeenCalledWith(PATIENT_ID, dto);
    });
  });

  describe('findAllSleep', () => {
    it('returns sleep history', async () => {
      const result = await controller.findAllSleep(PATIENT_ID);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createSport', () => {
    it('delegates to SportMetricsService.create', async () => {
      const dto = { recordedAt: new Date().toISOString(), sport: 'RUNNING' } as any;
      await controller.createSport(PATIENT_ID, dto);
      expect(mockSportService.create).toHaveBeenCalledWith(PATIENT_ID, dto);
    });
  });

  describe('findAllAlerts', () => {
    it('delegates to AlertsService.findAll with filter', async () => {
      const dto = { unreadOnly: true };
      await controller.findAllAlerts(PATIENT_ID, dto);
      expect(mockAlertsService.findAll).toHaveBeenCalledWith(PATIENT_ID, dto);
    });
  });

  describe('markAlertRead', () => {
    it('calls markRead with alert id', async () => {
      const alertId = 'alert-uuid';
      await controller.markAlertRead(alertId);
      expect(mockAlertsService.markRead).toHaveBeenCalledWith(alertId);
    });
  });

  describe('resolveAlert', () => {
    it('calls resolve with alert id', async () => {
      const alertId = 'alert-uuid';
      await controller.resolveAlert(alertId);
      expect(mockAlertsService.resolve).toHaveBeenCalledWith(alertId);
    });
  });

  describe('computeTrends', () => {
    it('delegates to TrendsService.computeForPatient with period', async () => {
      await controller.computeTrends(PATIENT_ID, 'MONTHLY');
      expect(mockTrendsService.computeForPatient).toHaveBeenCalledWith(PATIENT_ID, 'MONTHLY');
    });
  });
});
