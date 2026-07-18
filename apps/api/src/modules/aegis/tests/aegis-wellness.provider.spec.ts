import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationStatus } from '@bio/database';
import { AegisWellnessProvider } from '../providers/aegis-wellness.provider';
import { PrismaService } from '../../../database/prisma.service';
import { InsightEngineService } from '../services/insight-engine.service';
import { RecommendationService } from '../services/recommendation.service';
import { PredictionsService } from '../services/predictions.service';
import { ExplainabilityEngine } from '../../gaia/explainability';
import { ClinicalContext } from '../../gaia/contracts';

describe('AegisWellnessProvider', () => {
  let provider: AegisWellnessProvider;
  let prisma: { healthInsight: { findMany: jest.Mock } };
  let insightEngine: { generateInsights: jest.Mock };
  let recommendationService: { generateFromInsights: jest.Mock; getRecommendations: jest.Mock };
  let predictionsService: { computePredictions: jest.Mock };

  const context: ClinicalContext = {
    patientId: 'patient-1',
    metadata: { generatedAt: new Date(), window: { from: new Date(), to: new Date() }, sourcesQueried: [] },
    patient: null,
    vitals: { available: false, items: [] },
    laboratory: { available: false, items: [] },
    lifestyle: { available: false, items: [] },
    nutrition: { available: false, items: [] },
    medication: { available: false, items: [] },
    conditions: { available: false, items: [] },
    assessments: { available: false, items: [] },
    wearables: { available: false, items: [] },
    familyHistory: { available: false, items: [] },
    genomics: { available: false, items: [] },
    imaging: { available: false, items: [] },
    fhirResources: { available: false, items: [] },
  };

  beforeEach(async () => {
    prisma = { healthInsight: { findMany: jest.fn().mockResolvedValue([]) } };
    insightEngine = { generateInsights: jest.fn().mockResolvedValue(0) };
    recommendationService = {
      generateFromInsights: jest.fn().mockResolvedValue(0),
      getRecommendations: jest.fn().mockResolvedValue([]),
    };
    predictionsService = { computePredictions: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AegisWellnessProvider,
        ExplainabilityEngine,
        { provide: PrismaService, useValue: prisma },
        { provide: InsightEngineService, useValue: insightEngine },
        { provide: RecommendationService, useValue: recommendationService },
        { provide: PredictionsService, useValue: predictionsService },
      ],
    }).compile();

    provider = module.get(AegisWellnessProvider);
  });

  it('declares itself as the wellness domain provider', () => {
    expect(provider.name).toBe('aegis-wellness');
    expect(provider.domain).toBe('WELLNESS');
    expect(provider.version).toBe('1.0.0');
  });

  it('supports() is always true (no gating in this sprint)', () => {
    expect(provider.supports()).toBe(true);
  });

  describe('generateInsights', () => {
    it('delegates to InsightEngineService.generateInsights and maps the recent rows it persisted', async () => {
      const generatedAt = new Date();
      prisma.healthInsight.findMany.mockResolvedValue([
        {
          id: 'insight-1',
          category: 'SLEEP',
          priority: 'ATENCAO',
          title: 'Sono insuficiente',
          message: 'msg',
          dataWindow: 7,
          algorithm: 'sleep-threshold-v1',
          insightType: 'SLEEP_INSUFFICIENT',
          generatedAt,
        },
      ]);

      const result = await provider.generateInsights(context);

      expect(insightEngine.generateInsights).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual([
        {
          insightId: 'insight-1',
          provider: 'aegis-wellness',
          domain: 'WELLNESS',
          category: 'SLEEP',
          priority: 'ATENCAO',
          title: 'Sono insuficiente',
          message: 'msg',
          explainability: {
            decisionId: expect.any(String),
            confidence: {
              score: 0,
              level: 'LOW',
              factors: ['completeness: 0%'],
              missingInformation: ['Missing Labs', 'Missing Wearable Data', 'Missing Medication History'],
              dataQuality: null,
              completeness: 0,
            },
            reasoning: 'msg',
            evidence: [{ source: 'aegis.dailyMetrics', field: 'dataWindow', value: 7, recordedAt: generatedAt }],
            sourceProvider: 'aegis-wellness',
            generatedAt: expect.any(Date),
            guidelineReferences: [],
            limitations: [],
            warnings: [],
            metadata: { algorithm: 'sleep-threshold-v1', insightType: 'SLEEP_INSUFFICIENT' },
          },
        },
      ]);
    });
  });

  describe('generateRecommendations', () => {
    it('does nothing when there are no recent insights, and returns pending recommendations', async () => {
      prisma.healthInsight.findMany.mockResolvedValue([]);
      recommendationService.getRecommendations.mockResolvedValue([
        {
          id: 'rec-1',
          priority: 'ATENCAO',
          title: 'Priorize o sono',
          description: 'desc',
          rationale: 'rationale',
          metrics: ['sleepMinutes'],
          action: 'durma mais',
        },
      ]);

      const result = await provider.generateRecommendations(context, []);

      expect(recommendationService.generateFromInsights).not.toHaveBeenCalled();
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith('patient-1', RecommendationStatus.PENDING);
      expect(result).toEqual([
        {
          recommendationId: 'rec-1',
          provider: 'aegis-wellness',
          priority: 'ATENCAO',
          category: 'WELLNESS',
          title: 'Priorize o sono',
          description: 'desc',
          rationale: 'rationale',
          actions: ['durma mais'],
          explainability: {
            decisionId: expect.any(String),
            confidence: {
              score: 0,
              level: 'LOW',
              factors: ['completeness: 0%'],
              missingInformation: ['Missing Labs', 'Missing Wearable Data', 'Missing Medication History'],
              dataQuality: null,
              completeness: 0,
            },
            reasoning: 'rationale',
            evidence: [{ source: 'aegis', field: 'sleepMinutes', value: null }],
            sourceProvider: 'aegis-wellness',
            generatedAt: expect.any(Date),
            guidelineReferences: [],
            limitations: [],
            warnings: [],
            metadata: {},
          },
        },
      ]);
    });

    it('forwards recent insights into RecommendationService.generateFromInsights', async () => {
      prisma.healthInsight.findMany.mockResolvedValue([
        {
          id: 'insight-1',
          category: 'SLEEP',
          priority: 'ATENCAO',
          insightType: 'SLEEP_INSUFFICIENT',
          title: 'Sono insuficiente',
          message: 'msg',
          metrics: ['sleepMinutes'],
          algorithm: 'sleep-threshold-v1',
          dataWindow: 7,
        },
      ]);

      await provider.generateRecommendations(context, []);

      expect(recommendationService.generateFromInsights).toHaveBeenCalledWith(
        'patient-1',
        [
          {
            category: 'SLEEP',
            priority: 'ATENCAO',
            insightType: 'SLEEP_INSUFFICIENT',
            title: 'Sono insuficiente',
            message: 'msg',
            metrics: ['sleepMinutes'],
            algorithm: 'sleep-threshold-v1',
            dataWindow: 7,
          },
        ],
        new Map([['SLEEP_INSUFFICIENT', 'insight-1']]),
      );
    });
  });

  describe('generatePredictions', () => {
    it('delegates to PredictionsService.computePredictions and maps the saved rows', async () => {
      const generatedAt = new Date();
      predictionsService.computePredictions.mockResolvedValue([
        {
          metric: 'sleepMinutes',
          currentValue: 420,
          predictedValue: 400,
          confidence: 0.7,
          explanation: 'tendência de queda',
          algorithm: 'linear-regression-v1',
          trend: 'DOWN',
          riskLevel: 'MEDIUM',
          generatedAt,
        },
      ]);

      const result = await provider.generatePredictions(context);

      expect(predictionsService.computePredictions).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual([
        {
          predictionType: 'sleepMinutes',
          currentValue: 420,
          predictedValue: 400,
          predictionDate: generatedAt,
          modelVersion: 'linear-regression-v1',
          explainability: {
            decisionId: expect.any(String),
            confidence: {
              score: 0.7,
              level: 'HIGH',
              factors: ['completeness: 0%'],
              missingInformation: ['Missing Labs', 'Missing Wearable Data', 'Missing Medication History'],
              dataQuality: null,
              completeness: 0,
            },
            reasoning: 'tendência de queda',
            evidence: [],
            sourceProvider: 'aegis-wellness',
            generatedAt: expect.any(Date),
            guidelineReferences: [],
            limitations: [],
            warnings: [],
            metadata: { algorithm: 'linear-regression-v1', trend: 'DOWN', riskLevel: 'MEDIUM' },
          },
        },
      ]);
    });
  });
});
