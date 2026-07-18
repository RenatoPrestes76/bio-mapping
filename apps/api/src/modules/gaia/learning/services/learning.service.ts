import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../../../../common/audit/audit-log.service.js';
import { LearningRepository } from '../repositories/learning.repository.js';
import { buildConfusionMatrix, calculateMetrics, metricsFromOutcomes } from '../engine/metrics-calculator.js';
import { runAllDriftDetectors } from '../engine/drift-detector.js';
import { computeOverallCalibrationScore } from '../engine/confidence-calibrator.js';
import type { CreateOutcomeDto } from '../dto/create-outcome.dto.js';
import type { CreateFeedbackDto } from '../dto/create-feedback.dto.js';
import type {
  ClinicalOutcome,
  ModelMetrics,
  ModelDriftEvent,
  LearningFeedback,
  ContinuousLearningStatistics,
  OutcomeCategory,
  RecommendationAdherence,
  FeedbackRole,
  FeedbackClassification,
  DriftType,
} from '@bio/database';

const LEARNING_VERSION = '1.0';
const POSITIVE_OUTCOMES = new Set<string>(['IMPROVED', 'RESOLVED', 'STABLE']);

@Injectable()
export class LearningService {
  constructor(
    private readonly repository: LearningRepository,
    private readonly audit: AuditLogService,
  ) {}

  async registerOutcome(dto: CreateOutcomeDto, userId: string): Promise<ClinicalOutcome> {
    const outcome = await this.repository.createOutcome({
      tenantId: dto.tenantId,
      decisionId: dto.decisionId,
      patientId: dto.patientId,
      followUpDate: new Date(dto.followUpDate),
      outcome: dto.outcome as OutcomeCategory,
      validatedBy: dto.validatedBy,
      comments: dto.comments,
      modelVersion: dto.modelVersion ?? LEARNING_VERSION,
    });

    if (dto.predictedValue && dto.actualValue) {
      const sample = metricsFromOutcomes(dto.predictedValue, dto.outcome);
      const accuracy = sample.predicted === sample.actual ? 1 : 0;
      const difference = dto.predictedValue !== dto.actualValue ? 1 : 0;
      await this.repository.createPredictionValidation({
        tenantId: dto.tenantId,
        outcomeId: outcome.id,
        decisionId: dto.decisionId,
        predictedValue: dto.predictedValue,
        actualValue: dto.actualValue,
        difference,
        accuracy,
        modelVersion: dto.modelVersion ?? LEARNING_VERSION,
        variables: dto.variables,
      });
    }

    if (dto.recommendation && dto.adherence) {
      await this.repository.createRecommendationValidation({
        tenantId: dto.tenantId,
        outcomeId: outcome.id,
        decisionId: dto.decisionId,
        recommendation: dto.recommendation,
        adherence: dto.adherence as RecommendationAdherence,
        outcomeAchieved: dto.outcome as OutcomeCategory,
        modelVersion: dto.modelVersion ?? LEARNING_VERSION,
      });
    }

    await this.audit.log('OUTCOME_REGISTERED', { userId, metadata: { decisionId: dto.decisionId, outcome: dto.outcome } });

    return outcome;
  }

  async findOutcome(id: string): Promise<ClinicalOutcome> {
    const outcome = await this.repository.findOutcomeById(id);
    if (!outcome) throw new NotFoundException(`Outcome ${id} not found`);
    return outcome;
  }

  async getModelPerformance(tenantId?: string): Promise<ModelMetrics[]> {
    const existing = await this.repository.findLatestMetrics(tenantId);
    if (existing.length > 0) return existing;

    const predictions = await this.repository.findRecentPredictions(tenantId);
    if (predictions.length === 0) return [];

    const samples = predictions.map((p) => ({
      predicted: p.accuracy !== null && (p.accuracy ?? 0) >= 0.5,
      actual: p.predictedValue === p.actualValue,
      confidence: p.accuracy ?? undefined,
    }));

    const matrix = buildConfusionMatrix(samples);
    const metrics = calculateMetrics(matrix, samples);
    const calibration = computeOverallCalibrationScore(
      predictions.map((p) => ({ confidence: p.accuracy ?? 0.5, correct: p.predictedValue === p.actualValue })),
    );

    const saved = await this.repository.createModelMetrics({
      tenantId,
      modelName: 'clinical-decision-engine',
      modelVersion: LEARNING_VERSION,
      ...metrics,
      calibration: calibration.actualAccuracy,
      sampleSize: predictions.length,
    });

    await this.audit.log('MODEL_METRICS_COMPUTED', { metadata: { sampleSize: predictions.length } });

    return [saved];
  }

  async getStatistics(tenantId?: string): Promise<ContinuousLearningStatistics> {
    const totalOutcomes = await this.repository.countOutcomes(tenantId);
    const feedbackCount = await this.repository.countFeedback(tenantId);
    const activeDrift = await this.repository.findActiveDriftEvents(tenantId);
    const recentOutcomes = await this.repository.findRecentOutcomes(tenantId, 200);

    const positiveCount = recentOutcomes.filter((o) => POSITIVE_OUTCOMES.has(o.outcome)).length;
    const positiveOutcomeRate = recentOutcomes.length > 0 ? Math.round((positiveCount / recentOutcomes.length) * 100) / 100 : null;

    const predictions = await this.repository.findRecentPredictions(tenantId, 200);
    const overallAccuracy =
      predictions.length > 0
        ? Math.round((predictions.reduce((s, p) => s + (p.accuracy ?? 0), 0) / predictions.length) * 100) / 100
        : null;

    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = await this.repository.createStatistics({
      tenantId,
      periodStart,
      periodEnd: now,
      totalDecisions: predictions.length,
      totalOutcomes,
      overallAccuracy: overallAccuracy ?? undefined,
      driftEventsCount: activeDrift.length,
      feedbackCount,
      positiveOutcomeRate: positiveOutcomeRate ?? undefined,
      summary: {
        outcomeDistribution: this.buildOutcomeDistribution(recentOutcomes),
        activeAlerts: activeDrift.length,
        version: LEARNING_VERSION,
      },
    });

    return stats;
  }

  async getDriftEvents(tenantId?: string): Promise<ModelDriftEvent[]> {
    const recentPredictions = await this.repository.findRecentPredictions(tenantId, 200);
    if (recentPredictions.length >= 20) {
      const half = Math.floor(recentPredictions.length / 2);
      const baselineAccuracies = recentPredictions.slice(half).map((p) => p.accuracy ?? 0.5);
      const currentAccuracies = recentPredictions.slice(0, half).map((p) => p.accuracy ?? 0.5);

      const driftResults = runAllDriftDetectors({
        baselineValues: baselineAccuracies,
        currentValues: currentAccuracies,
        recentAccuracies: currentAccuracies,
        baselineFeatureStats: {},
        currentFeatureStats: {},
        baselinePopulation: {},
        currentPopulation: {},
        threshold: 0.15,
      });

      for (const result of driftResults) {
        await this.repository.createDriftEvent({
          tenantId,
          modelName: 'clinical-decision-engine',
          driftType: result.driftType as DriftType,
          driftScore: result.driftScore,
          threshold: result.threshold,
          features: result.affectedFeatures,
          severity: result.severity,
        });
        await this.audit.log('DRIFT_EVENT_DETECTED', {
          metadata: { driftType: result.driftType, driftScore: result.driftScore, severity: result.severity },
        });
      }
    }

    return this.repository.findActiveDriftEvents(tenantId);
  }

  async registerFeedback(dto: CreateFeedbackDto, userId: string): Promise<LearningFeedback> {
    const feedback = await this.repository.createFeedback({
      tenantId: dto.tenantId,
      decisionId: dto.decisionId,
      userId,
      role: dto.role as FeedbackRole,
      classification: dto.classification as FeedbackClassification,
      comment: dto.comment,
      suggestedAction: dto.suggestedAction,
      modelVersion: dto.modelVersion ?? LEARNING_VERSION,
    });

    await this.audit.log('LEARNING_FEEDBACK_ADDED', {
      userId,
      metadata: { decisionId: dto.decisionId, classification: dto.classification, role: dto.role },
    });

    return feedback;
  }

  async getFeedbackHistory(decisionId?: string, tenantId?: string): Promise<LearningFeedback[]> {
    if (decisionId) return this.repository.findFeedbackByDecision(decisionId);
    return this.repository.findFeedbackHistory(tenantId);
  }

  private buildOutcomeDistribution(outcomes: ClinicalOutcome[]): Record<string, number> {
    return outcomes.reduce(
      (acc, o) => {
        acc[o.outcome] = (acc[o.outcome] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
