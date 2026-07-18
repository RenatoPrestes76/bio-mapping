import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { LearningService } from '../services/learning.service.js';
import type { LearningRepository } from '../repositories/learning.repository.js';
import type { AuditLogService } from '../../../../common/audit/audit-log.service.js';
import type { ClinicalOutcome, ModelMetrics, LearningFeedback, ModelDriftEvent, ContinuousLearningStatistics } from '@bio/database';

const makeOutcome = (overrides: Partial<ClinicalOutcome> = {}): ClinicalOutcome => ({
  id: 'o1', tenantId: null, decisionId: 'd1', patientId: 'p1',
  followUpDate: new Date('2026-10-15'), outcome: 'IMPROVED' as any,
  validatedBy: 'physician', comments: null, modelVersion: '1.0',
  createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

const makeMetrics = (overrides: Partial<ModelMetrics> = {}): ModelMetrics => ({
  id: 'm1', tenantId: null, modelName: 'clinical-decision-engine', modelVersion: '1.0',
  accuracy: 0.82, precision: 0.79, recall: 0.85, specificity: 0.78,
  sensitivity: 0.85, f1Score: 0.82, rocAuc: 0.88, calibration: 0.9,
  sampleSize: 100, computedAt: new Date(),
  ...overrides,
});

const makeFeedback = (overrides: Partial<LearningFeedback> = {}): LearningFeedback => ({
  id: 'f1', tenantId: null, decisionId: 'd1', userId: 'u1',
  role: 'PHYSICIAN' as any, classification: 'CORRECT' as any,
  comment: null, suggestedAction: null, modelVersion: '1.0', createdAt: new Date(),
  ...overrides,
});

const makeDriftEvent = (overrides: Partial<ModelDriftEvent> = {}): ModelDriftEvent => ({
  id: 'dr1', tenantId: null, modelName: 'clinical-decision-engine',
  driftType: 'CONCEPT_DRIFT' as any, driftScore: 0.25, threshold: 0.15,
  features: null, severity: 'MODERATE', resolved: false, resolvedAt: null, createdAt: new Date(),
  ...overrides,
});

const makeStats = (overrides: Partial<ContinuousLearningStatistics> = {}): ContinuousLearningStatistics => ({
  id: 's1', tenantId: null, periodStart: new Date(), periodEnd: new Date(),
  totalDecisions: 50, totalOutcomes: 30, overallAccuracy: 0.82,
  driftEventsCount: 1, feedbackCount: 5, positiveOutcomeRate: 0.73,
  averageConfidence: 0.78, summary: null, computedAt: new Date(),
  ...overrides,
});

describe('LearningService', () => {
  let service: LearningService;
  let repo: jest.Mocked<LearningRepository>;
  let audit: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    repo = {
      createOutcome: jest.fn(),
      findOutcomeById: jest.fn(),
      findOutcomesByDecision: jest.fn(),
      findRecentOutcomes: jest.fn(),
      countOutcomes: jest.fn(),
      createPredictionValidation: jest.fn(),
      findPredictionsByDecision: jest.fn(),
      findRecentPredictions: jest.fn(),
      createRecommendationValidation: jest.fn(),
      createModelMetrics: jest.fn(),
      findLatestMetrics: jest.fn(),
      findMetricsByModel: jest.fn(),
      createDriftEvent: jest.fn(),
      findActiveDriftEvents: jest.fn(),
      resolveDriftEvent: jest.fn(),
      createFeedback: jest.fn(),
      findFeedbackByDecision: jest.fn(),
      findFeedbackHistory: jest.fn(),
      countFeedback: jest.fn(),
      createStatistics: jest.fn(),
      findLatestStatistics: jest.fn(),
      createSnapshot: jest.fn(),
      findSnapshotsByModel: jest.fn(),
    } as any;
    audit = { log: jest.fn() } as any;
    service = new LearningService(repo, audit);
  });

  describe('registerOutcome', () => {
    it('creates outcome and logs audit', async () => {
      const outcome = makeOutcome();
      (repo.createOutcome as any).mockResolvedValue(outcome);
      const result = await service.registerOutcome(
        { decisionId: 'd1', patientId: 'p1', followUpDate: '2026-10-15', outcome: 'IMPROVED', validatedBy: 'physician' },
        'u1',
      );
      expect(result.id).toBe('o1');
      expect(audit.log).toHaveBeenCalledWith('OUTCOME_REGISTERED', expect.objectContaining({ userId: 'u1' }));
    });

    it('creates prediction validation when predictedValue and actualValue provided', async () => {
      const outcome = makeOutcome();
      (repo.createOutcome as any).mockResolvedValue(outcome);
      (repo.createPredictionValidation as any).mockResolvedValue({});
      await service.registerOutcome(
        { decisionId: 'd1', patientId: 'p1', followUpDate: '2026-10-15', outcome: 'IMPROVED', validatedBy: 'physician', predictedValue: 'LOW', actualValue: 'IMPROVED' },
        'u1',
      );
      expect(repo.createPredictionValidation).toHaveBeenCalled();
    });

    it('skips prediction validation when predictedValue missing', async () => {
      (repo.createOutcome as any).mockResolvedValue(makeOutcome());
      await service.registerOutcome(
        { decisionId: 'd1', patientId: 'p1', followUpDate: '2026-10-15', outcome: 'IMPROVED', validatedBy: 'physician' },
        'u1',
      );
      expect(repo.createPredictionValidation).not.toHaveBeenCalled();
    });

    it('creates recommendation validation when recommendation and adherence provided', async () => {
      (repo.createOutcome as any).mockResolvedValue(makeOutcome());
      (repo.createRecommendationValidation as any).mockResolvedValue({});
      await service.registerOutcome(
        {
          decisionId: 'd1', patientId: 'p1', followUpDate: '2026-10-15', outcome: 'IMPROVED',
          validatedBy: 'physician', recommendation: 'Seguir dieta', adherence: 'FOLLOWED',
        },
        'u1',
      );
      expect(repo.createRecommendationValidation).toHaveBeenCalled();
    });
  });

  describe('findOutcome', () => {
    it('returns outcome when found', async () => {
      const outcome = makeOutcome();
      (repo.findOutcomeById as any).mockResolvedValue(outcome);
      const result = await service.findOutcome('o1');
      expect(result.id).toBe('o1');
    });

    it('throws NotFoundException when not found', async () => {
      (repo.findOutcomeById as any).mockResolvedValue(null);
      await expect(service.findOutcome('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getModelPerformance', () => {
    it('returns existing metrics without recomputing', async () => {
      const metrics = [makeMetrics()];
      (repo.findLatestMetrics as any).mockResolvedValue(metrics);
      const result = await service.getModelPerformance();
      expect(result).toHaveLength(1);
      expect(repo.findRecentPredictions).not.toHaveBeenCalled();
    });

    it('computes metrics from predictions when none exist', async () => {
      (repo.findLatestMetrics as any).mockResolvedValue([]);
      const predictions = Array(10).fill(null).map((_, i) => ({
        id: `p${i}`, outcomeId: 'o1', decisionId: 'd1', tenantId: null,
        predictedValue: 'LOW', actualValue: 'LOW',
        difference: 0, accuracy: 1, modelVersion: '1.0',
        variables: null, createdAt: new Date(),
      }));
      (repo.findRecentPredictions as any).mockResolvedValue(predictions);
      (repo.createModelMetrics as any).mockResolvedValue(makeMetrics());
      const result = await service.getModelPerformance();
      expect(repo.createModelMetrics).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(audit.log).toHaveBeenCalledWith('MODEL_METRICS_COMPUTED', expect.anything());
    });

    it('returns empty array when no predictions exist', async () => {
      (repo.findLatestMetrics as any).mockResolvedValue([]);
      (repo.findRecentPredictions as any).mockResolvedValue([]);
      const result = await service.getModelPerformance();
      expect(result).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('computes and returns statistics', async () => {
      (repo.countOutcomes as any).mockResolvedValue(30);
      (repo.countFeedback as any).mockResolvedValue(5);
      (repo.findActiveDriftEvents as any).mockResolvedValue([makeDriftEvent()]);
      (repo.findRecentOutcomes as any).mockResolvedValue([makeOutcome(), makeOutcome({ outcome: 'WORSENED' as any })]);
      (repo.findRecentPredictions as any).mockResolvedValue([
        { accuracy: 0.9, predictedValue: 'LOW', actualValue: 'LOW', createdAt: new Date() },
        { accuracy: 0.7, predictedValue: 'HIGH', actualValue: 'HIGH', createdAt: new Date() },
      ]);
      (repo.createStatistics as any).mockResolvedValue(makeStats());
      const result = await service.getStatistics();
      expect(result).toBeDefined();
      expect(repo.createStatistics).toHaveBeenCalledWith(
        expect.objectContaining({ totalOutcomes: 30, feedbackCount: 5 }),
      );
    });

    it('computes positive outcome rate correctly', async () => {
      (repo.countOutcomes as any).mockResolvedValue(4);
      (repo.countFeedback as any).mockResolvedValue(0);
      (repo.findActiveDriftEvents as any).mockResolvedValue([]);
      (repo.findRecentOutcomes as any).mockResolvedValue([
        makeOutcome({ outcome: 'IMPROVED' as any }),
        makeOutcome({ outcome: 'IMPROVED' as any }),
        makeOutcome({ outcome: 'WORSENED' as any }),
        makeOutcome({ outcome: 'HOSPITALIZED' as any }),
      ]);
      (repo.findRecentPredictions as any).mockResolvedValue([]);
      (repo.createStatistics as any).mockResolvedValue(makeStats());
      await service.getStatistics();
      expect(repo.createStatistics).toHaveBeenCalledWith(
        expect.objectContaining({ positiveOutcomeRate: 0.5 }),
      );
    });
  });

  describe('getDriftEvents', () => {
    it('returns active drift events', async () => {
      (repo.findRecentPredictions as any).mockResolvedValue([]);
      const driftEvents = [makeDriftEvent()];
      (repo.findActiveDriftEvents as any).mockResolvedValue(driftEvents);
      const result = await service.getDriftEvents();
      expect(result).toHaveLength(1);
    });

    it('runs drift detection with enough predictions', async () => {
      const predictions = Array(25).fill(null).map((_, i) => ({
        id: `p${i}`, accuracy: i < 12 ? 0.9 : 0.3,
        predictedValue: 'LOW', actualValue: 'LOW', createdAt: new Date(),
      }));
      (repo.findRecentPredictions as any).mockResolvedValue(predictions);
      (repo.createDriftEvent as any).mockResolvedValue(makeDriftEvent());
      (repo.findActiveDriftEvents as any).mockResolvedValue([]);
      await service.getDriftEvents();
      expect(repo.findActiveDriftEvents).toHaveBeenCalled();
    });
  });

  describe('registerFeedback', () => {
    it('creates feedback and logs audit', async () => {
      const feedback = makeFeedback();
      (repo.createFeedback as any).mockResolvedValue(feedback);
      const result = await service.registerFeedback(
        { decisionId: 'd1', role: 'PHYSICIAN', classification: 'CORRECT', comment: 'Correto.' },
        'u1',
      );
      expect(result.id).toBe('f1');
      expect(audit.log).toHaveBeenCalledWith('LEARNING_FEEDBACK_ADDED', expect.objectContaining({ userId: 'u1' }));
    });

    it('passes all DTO fields to repository', async () => {
      (repo.createFeedback as any).mockResolvedValue(makeFeedback());
      await service.registerFeedback(
        {
          decisionId: 'd1', role: 'NUTRITIONIST', classification: 'PARTIALLY_CORRECT',
          comment: 'Observação.', suggestedAction: 'Reavaliar IMC.',
        },
        'u2',
      );
      expect(repo.createFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'NUTRITIONIST', classification: 'PARTIALLY_CORRECT', comment: 'Observação.' }),
      );
    });
  });

  describe('getFeedbackHistory', () => {
    it('queries by decisionId when provided', async () => {
      (repo.findFeedbackByDecision as any).mockResolvedValue([makeFeedback()]);
      await service.getFeedbackHistory('d1');
      expect(repo.findFeedbackByDecision).toHaveBeenCalledWith('d1');
      expect(repo.findFeedbackHistory).not.toHaveBeenCalled();
    });

    it('queries history without decisionId', async () => {
      (repo.findFeedbackHistory as any).mockResolvedValue([makeFeedback()]);
      await service.getFeedbackHistory(undefined, 'tenant1');
      expect(repo.findFeedbackHistory).toHaveBeenCalledWith('tenant1');
    });
  });
});
