import { Test, TestingModule } from '@nestjs/testing';
import { AegisSchedulerService } from '../schedulers/aegis-scheduler.service';
import { PrismaService } from '../../../database/prisma.service';
import { InsightEngineService } from '../services/insight-engine.service';
import { RecommendationService } from '../services/recommendation.service';
import { GoalsService } from '../services/goals.service';
import { PredictionsService } from '../services/predictions.service';
import { DecisionEngineService } from '../../gaia/decision-engine.service';

describe('AegisSchedulerService', () => {
  let scheduler: AegisSchedulerService;
  let decisionEngine: { runPipeline: jest.Mock };
  let goals: { autoAdjustGoals: jest.Mock };

  beforeEach(async () => {
    decisionEngine = { runPipeline: jest.fn() };
    goals = { autoAdjustGoals: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AegisSchedulerService,
        { provide: PrismaService, useValue: { dailyMetrics: { groupBy: jest.fn().mockResolvedValue([]) } } },
        { provide: InsightEngineService, useValue: { generateInsights: jest.fn() } },
        { provide: RecommendationService, useValue: { generateFromInsights: jest.fn() } },
        { provide: GoalsService, useValue: goals },
        { provide: PredictionsService, useValue: { computePredictions: jest.fn() } },
        { provide: DecisionEngineService, useValue: decisionEngine },
      ],
    }).compile();

    scheduler = module.get(AegisSchedulerService);
  });

  describe('runAllForPatient (Sprint 14.1, T7)', () => {
    it('delegates insights/recommendations/predictions to the aegis-wellness provider via the pipeline', async () => {
      decisionEngine.runPipeline.mockResolvedValue({
        patientId: 'patient-1',
        generatedAt: new Date(),
        providersRun: ['aegis-wellness'],
        results: [{ provider: 'aegis-wellness', insights: [{ insightId: 'i1' }, { insightId: 'i2' }], recommendations: [], predictions: [] }],
      });

      const result = await scheduler.runAllForPatient('patient-1');

      expect(decisionEngine.runPipeline).toHaveBeenCalledWith('patient-1', { providers: ['aegis-wellness'] });
      expect(result.insights).toBe(2);
      expect(result.decisionResult.providersRun).toEqual(['aegis-wellness']);
    });

    it('still calls autoAdjustGoals directly (goals are not part of the DecisionProvider contract yet)', async () => {
      decisionEngine.runPipeline.mockResolvedValue({
        patientId: 'patient-1',
        generatedAt: new Date(),
        providersRun: [],
        results: [],
      });

      await scheduler.runAllForPatient('patient-1');

      expect(goals.autoAdjustGoals).toHaveBeenCalledWith('patient-1');
    });

    it('returns insights: 0 when the wellness provider did not run', async () => {
      decisionEngine.runPipeline.mockResolvedValue({
        patientId: 'patient-1',
        generatedAt: new Date(),
        providersRun: [],
        results: [],
      });

      const result = await scheduler.runAllForPatient('patient-1');

      expect(result.insights).toBe(0);
    });
  });
});
