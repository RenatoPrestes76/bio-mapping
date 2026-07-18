import { Injectable } from '@nestjs/common';
import {
  InsightPriority,
  PathwayStatus,
  RecommendationStatus,
  TimelineEventSeverity,
  TimelineEventType,
} from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

export interface AggregatedTimelineEvent {
  id: string;
  patientId: string;
  eventType: TimelineEventType;
  severity: TimelineEventSeverity;
  title: string;
  description?: string;
  sourceId: string;
  sourceTable: string;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

const DECISION_PRIORITY_SEVERITY: Record<string, TimelineEventSeverity> = {
  CRITICAL: TimelineEventSeverity.CRITICAL,
  HIGH: TimelineEventSeverity.HIGH,
  MEDIUM: TimelineEventSeverity.MEDIUM,
  LOW: TimelineEventSeverity.LOW,
};

const INSIGHT_PRIORITY_SEVERITY: Record<string, TimelineEventSeverity> = {
  [InsightPriority.ALTA_PRIORIDADE]: TimelineEventSeverity.CRITICAL,
  [InsightPriority.IMPORTANTE]: TimelineEventSeverity.HIGH,
  [InsightPriority.ATENCAO]: TimelineEventSeverity.MEDIUM,
  [InsightPriority.INFORMATIVO]: TimelineEventSeverity.INFO,
};

@Injectable()
export class TimelineAggregator {
  constructor(private readonly prisma: PrismaService) {}

  async aggregate(patientId: string, limit = 100): Promise<AggregatedTimelineEvent[]> {
    const [decisions, pathways, insights, recommendations, predictions] = await Promise.all([
      this.prisma.clinicalDecision.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.clinicalPathway.findMany({
        where: { patientId },
        orderBy: { startedAt: 'desc' },
        take: limit,
      }),
      this.prisma.healthInsight.findMany({
        where: { patientId },
        orderBy: { generatedAt: 'desc' },
        take: limit,
      }),
      this.prisma.recommendation.findMany({
        where: { patientId },
        orderBy: { generatedAt: 'desc' },
        take: limit,
      }),
      this.prisma.healthPrediction.findMany({
        where: { patientId },
        orderBy: { generatedAt: 'desc' },
        take: limit,
      }),
    ]);

    const events: AggregatedTimelineEvent[] = [
      ...decisions.map((d) => ({
        id: d.id,
        patientId: d.patientId,
        eventType: TimelineEventType.DECISION_CREATED,
        severity: DECISION_PRIORITY_SEVERITY[d.priority] ?? TimelineEventSeverity.INFO,
        title: d.title,
        description: d.description ?? undefined,
        sourceId: d.id,
        sourceTable: 'clinical_decisions',
        occurredAt: d.createdAt,
        metadata: { status: d.status, ruleId: d.ruleId } as Record<string, unknown>,
      })),
      ...pathways.map((p) => ({
        id: p.id,
        patientId: p.patientId,
        eventType:
          p.status === PathwayStatus.COMPLETED
            ? TimelineEventType.PATHWAY_COMPLETED
            : p.status === PathwayStatus.CANCELLED
              ? TimelineEventType.PATHWAY_CANCELLED
              : TimelineEventType.PATHWAY_STARTED,
        severity: TimelineEventSeverity.MEDIUM,
        title: p.name,
        description: p.description ?? undefined,
        sourceId: p.id,
        sourceTable: 'clinical_pathways',
        occurredAt: p.startedAt,
        metadata: { status: p.status, templateId: p.templateId } as Record<string, unknown>,
      })),
      ...insights.map((i) => ({
        id: i.id,
        patientId: i.patientId,
        eventType: TimelineEventType.INSIGHT_GENERATED,
        severity: INSIGHT_PRIORITY_SEVERITY[i.priority] ?? TimelineEventSeverity.INFO,
        title: i.title,
        description: i.message,
        sourceId: i.id,
        sourceTable: 'health_insights',
        occurredAt: i.generatedAt,
        metadata: { category: i.category, isRead: i.isRead } as Record<string, unknown>,
      })),
      ...recommendations.map((r) => ({
        id: r.id,
        patientId: r.patientId,
        eventType:
          r.status === RecommendationStatus.ACCEPTED
            ? TimelineEventType.RECOMMENDATION_ACCEPTED
            : r.status === RecommendationStatus.COMPLETED
              ? TimelineEventType.RECOMMENDATION_COMPLETED
              : TimelineEventType.RECOMMENDATION_CREATED,
        severity: INSIGHT_PRIORITY_SEVERITY[r.priority] ?? TimelineEventSeverity.INFO,
        title: r.title,
        description: r.description,
        sourceId: r.id,
        sourceTable: 'recommendations',
        occurredAt: r.generatedAt,
        metadata: { status: r.status, action: r.action } as Record<string, unknown>,
      })),
      ...predictions.map((p) => ({
        id: p.id,
        patientId: p.patientId,
        eventType: TimelineEventType.PREDICTION_GENERATED,
        severity: DECISION_PRIORITY_SEVERITY[p.riskLevel.toUpperCase()] ?? TimelineEventSeverity.INFO,
        title: `Predição: ${p.metric}`,
        description: p.explanation,
        sourceId: p.id,
        sourceTable: 'health_predictions',
        occurredAt: p.generatedAt,
        metadata: { metric: p.metric, trend: p.trend, confidence: p.confidence } as Record<string, unknown>,
      })),
    ];

    return events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, limit);
  }
}
