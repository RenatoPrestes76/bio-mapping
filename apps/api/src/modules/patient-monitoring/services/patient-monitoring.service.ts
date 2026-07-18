import { Injectable } from '@nestjs/common';
import { DecisionPriority, DecisionStatus, PathwayStatus, RecommendationStatus } from '@bio/database';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { TimelineEventFilters } from '../interfaces/patient-timeline-repository.interface.js';
import { AggregatedTimelineEvent, TimelineAggregator } from '../aggregators/timeline-aggregator.js';
import { PrismaPatientTimelineRepository } from '../repositories/prisma-patient-timeline.repository.js';

export interface PatientTimelineSummary {
  patientId: string;
  openDecisions: number;
  criticalDecisions: number;
  activePathways: number;
  pendingRecommendations: number;
  recentPredictions: number;
  generatedAt: Date;
}

@Injectable()
export class PatientMonitoringService {
  constructor(
    private readonly repo: PrismaPatientTimelineRepository,
    private readonly aggregator: TimelineAggregator,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async getTimeline(patientId: string, limit = 100, userId?: string): Promise<AggregatedTimelineEvent[]> {
    const events = await this.aggregator.aggregate(patientId, limit);
    await this.audit.log('TIMELINE_QUERIED', { userId, metadata: { patientId, count: events.length } });
    return events;
  }

  async getSummary(patientId: string, userId?: string): Promise<PatientTimelineSummary> {
    const [openDecisions, criticalDecisions, activePathways, pendingRecommendations, recentPredictions] =
      await Promise.all([
        this.prisma.clinicalDecision.count({ where: { patientId, status: DecisionStatus.OPEN } }),
        this.prisma.clinicalDecision.count({
          where: { patientId, status: DecisionStatus.OPEN, priority: DecisionPriority.CRITICAL },
        }),
        this.prisma.clinicalPathway.count({ where: { patientId, status: PathwayStatus.ACTIVE } }),
        this.prisma.recommendation.count({ where: { patientId, status: RecommendationStatus.PENDING } }),
        this.prisma.healthPrediction.count({
          where: { patientId, generatedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
        }),
      ]);

    const summary: PatientTimelineSummary = {
      patientId,
      openDecisions,
      criticalDecisions,
      activePathways,
      pendingRecommendations,
      recentPredictions,
      generatedAt: new Date(),
    };

    await this.audit.log('SUMMARY_QUERIED', { userId, metadata: { patientId } });
    return summary;
  }

  async getEvents(patientId: string, filters: Partial<TimelineEventFilters> = {}, userId?: string) {
    const events = await this.repo.findByPatient({ ...filters, patientId });
    await this.audit.log('TIMELINE_QUERIED', { userId, metadata: { patientId, source: 'events' } });
    return events;
  }
}
