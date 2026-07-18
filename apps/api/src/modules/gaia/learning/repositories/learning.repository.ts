import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service.js';
import type {
  ClinicalOutcome,
  PredictionValidation,
  RecommendationValidation,
  ModelMetrics,
  ModelDriftEvent,
  LearningFeedback,
  ContinuousLearningStatistics,
  PerformanceSnapshot,
  OutcomeCategory,
  RecommendationAdherence,
  FeedbackRole,
  FeedbackClassification,
  DriftType,
} from '@bio/database';

@Injectable()
export class LearningRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Outcomes ──────────────────────────────────────────────────────────────

  async createOutcome(data: {
    tenantId?: string;
    decisionId: string;
    patientId: string;
    followUpDate: Date;
    outcome: OutcomeCategory;
    validatedBy: string;
    comments?: string;
    modelVersion?: string;
  }): Promise<ClinicalOutcome> {
    return this.prisma.clinicalOutcome.create({
      data: {
        tenantId: data.tenantId,
        decisionId: data.decisionId,
        patientId: data.patientId,
        followUpDate: data.followUpDate,
        outcome: data.outcome,
        validatedBy: data.validatedBy,
        comments: data.comments,
        modelVersion: data.modelVersion ?? '1.0',
      },
    });
  }

  async findOutcomeById(id: string): Promise<ClinicalOutcome | null> {
    return this.prisma.clinicalOutcome.findUnique({ where: { id } });
  }

  async findOutcomesByDecision(decisionId: string): Promise<ClinicalOutcome[]> {
    return this.prisma.clinicalOutcome.findMany({
      where: { decisionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRecentOutcomes(tenantId?: string, limit = 100): Promise<ClinicalOutcome[]> {
    return this.prisma.clinicalOutcome.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countOutcomes(tenantId?: string): Promise<number> {
    return this.prisma.clinicalOutcome.count({
      where: tenantId ? { tenantId } : undefined,
    });
  }

  // ── Prediction Validations ─────────────────────────────────────────────────

  async createPredictionValidation(data: {
    tenantId?: string;
    outcomeId: string;
    decisionId: string;
    predictedValue: string;
    actualValue: string;
    difference?: number;
    accuracy?: number;
    modelVersion?: string;
    variables?: Record<string, unknown>;
  }): Promise<PredictionValidation> {
    return this.prisma.predictionValidation.create({
      data: {
        tenantId: data.tenantId,
        outcomeId: data.outcomeId,
        decisionId: data.decisionId,
        predictedValue: data.predictedValue,
        actualValue: data.actualValue,
        difference: data.difference,
        accuracy: data.accuracy,
        modelVersion: data.modelVersion ?? '1.0',
        variables: data.variables ? (data.variables as object) : undefined,
      },
    });
  }

  async findPredictionsByDecision(decisionId: string): Promise<PredictionValidation[]> {
    return this.prisma.predictionValidation.findMany({
      where: { decisionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRecentPredictions(tenantId?: string, limit = 200): Promise<PredictionValidation[]> {
    return this.prisma.predictionValidation.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Recommendation Validations ─────────────────────────────────────────────

  async createRecommendationValidation(data: {
    tenantId?: string;
    outcomeId: string;
    decisionId: string;
    recommendation: string;
    adherence: RecommendationAdherence;
    outcomeAchieved: OutcomeCategory;
    notes?: string;
    modelVersion?: string;
  }): Promise<RecommendationValidation> {
    return this.prisma.recommendationValidation.create({
      data: {
        tenantId: data.tenantId,
        outcomeId: data.outcomeId,
        decisionId: data.decisionId,
        recommendation: data.recommendation,
        adherence: data.adherence,
        outcomeAchieved: data.outcomeAchieved,
        notes: data.notes,
        modelVersion: data.modelVersion ?? '1.0',
      },
    });
  }

  // ── Model Metrics ──────────────────────────────────────────────────────────

  async createModelMetrics(data: {
    tenantId?: string;
    modelName: string;
    modelVersion: string;
    accuracy?: number;
    precision?: number;
    recall?: number;
    specificity?: number;
    sensitivity?: number;
    f1Score?: number;
    rocAuc?: number;
    calibration?: number;
    sampleSize?: number;
  }): Promise<ModelMetrics> {
    return this.prisma.modelMetrics.create({ data: { ...data } });
  }

  async findLatestMetrics(tenantId?: string): Promise<ModelMetrics[]> {
    const where = tenantId ? { tenantId } : undefined;
    const names = await this.prisma.modelMetrics.findMany({
      where,
      distinct: ['modelName'],
      select: { modelName: true },
    });
    return Promise.all(
      names.map((n) =>
        this.prisma.modelMetrics.findFirst({
          where: { modelName: n.modelName, ...(tenantId ? { tenantId } : {}) },
          orderBy: { computedAt: 'desc' },
        }) as Promise<ModelMetrics>,
      ),
    );
  }

  async findMetricsByModel(modelName: string, limit = 30): Promise<ModelMetrics[]> {
    return this.prisma.modelMetrics.findMany({
      where: { modelName },
      orderBy: { computedAt: 'desc' },
      take: limit,
    });
  }

  // ── Drift Events ───────────────────────────────────────────────────────────

  async createDriftEvent(data: {
    tenantId?: string;
    modelName: string;
    driftType: DriftType;
    driftScore: number;
    threshold: number;
    features?: string[];
    severity?: string;
  }): Promise<ModelDriftEvent> {
    return this.prisma.modelDriftEvent.create({
      data: {
        tenantId: data.tenantId,
        modelName: data.modelName,
        driftType: data.driftType,
        driftScore: data.driftScore,
        threshold: data.threshold,
        features: data.features ? (data.features as unknown as object) : undefined,
        severity: data.severity ?? 'MODERATE',
      },
    });
  }

  async findActiveDriftEvents(tenantId?: string): Promise<ModelDriftEvent[]> {
    return this.prisma.modelDriftEvent.findMany({
      where: { resolved: false, ...(tenantId ? { tenantId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveDriftEvent(id: string): Promise<ModelDriftEvent> {
    return this.prisma.modelDriftEvent.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    });
  }

  // ── Feedback ───────────────────────────────────────────────────────────────

  async createFeedback(data: {
    tenantId?: string;
    decisionId: string;
    userId: string;
    role: FeedbackRole;
    classification: FeedbackClassification;
    comment?: string;
    suggestedAction?: string;
    modelVersion?: string;
  }): Promise<LearningFeedback> {
    return this.prisma.learningFeedback.create({ data: { ...data, modelVersion: data.modelVersion ?? '1.0' } });
  }

  async findFeedbackByDecision(decisionId: string): Promise<LearningFeedback[]> {
    return this.prisma.learningFeedback.findMany({
      where: { decisionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findFeedbackHistory(tenantId?: string, limit = 50): Promise<LearningFeedback[]> {
    return this.prisma.learningFeedback.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countFeedback(tenantId?: string): Promise<number> {
    return this.prisma.learningFeedback.count({
      where: tenantId ? { tenantId } : undefined,
    });
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  async createStatistics(data: {
    tenantId?: string;
    periodStart: Date;
    periodEnd: Date;
    totalDecisions: number;
    totalOutcomes: number;
    overallAccuracy?: number;
    driftEventsCount: number;
    feedbackCount: number;
    positiveOutcomeRate?: number;
    averageConfidence?: number;
    summary?: Record<string, unknown>;
  }): Promise<ContinuousLearningStatistics> {
    return this.prisma.continuousLearningStatistics.create({
      data: {
        ...data,
        summary: data.summary ? (data.summary as object) : undefined,
      },
    });
  }

  async findLatestStatistics(tenantId?: string): Promise<ContinuousLearningStatistics | null> {
    return this.prisma.continuousLearningStatistics.findFirst({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { computedAt: 'desc' },
    });
  }

  // ── Performance Snapshots ──────────────────────────────────────────────────

  async createSnapshot(data: {
    tenantId?: string;
    modelName: string;
    snapshotDate: Date;
    metrics: Record<string, unknown>;
    outcomeStats?: Record<string, unknown>;
    driftStats?: Record<string, unknown>;
    version?: string;
  }): Promise<PerformanceSnapshot> {
    return this.prisma.performanceSnapshot.create({
      data: {
        tenantId: data.tenantId,
        modelName: data.modelName,
        snapshotDate: data.snapshotDate,
        metrics: data.metrics as object,
        outcomeStats: data.outcomeStats ? (data.outcomeStats as object) : undefined,
        driftStats: data.driftStats ? (data.driftStats as object) : undefined,
        version: data.version ?? '1.0',
      },
    });
  }

  async findSnapshotsByModel(modelName: string, limit = 30): Promise<PerformanceSnapshot[]> {
    return this.prisma.performanceSnapshot.findMany({
      where: { modelName },
      orderBy: { snapshotDate: 'desc' },
      take: limit,
    });
  }
}
