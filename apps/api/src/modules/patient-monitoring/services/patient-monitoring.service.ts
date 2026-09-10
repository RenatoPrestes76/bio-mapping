import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DecisionPriority, DecisionStatus, PathwayStatus, RecommendationStatus } from '@bio/database';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { TimelineEventFilters } from '../interfaces/patient-timeline-repository.interface.js';
import { AggregatedTimelineEvent, TimelineAggregator } from '../aggregators/timeline-aggregator.js';
import { PrismaPatientTimelineRepository } from '../repositories/prisma-patient-timeline.repository.js';

interface Actor { sub: string; role: string }

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

  async getTimeline(patientId: string, limit = 100, actor?: Actor): Promise<AggregatedTimelineEvent[]> {
    if (actor) await this.assertAccess(patientId, actor);
    const events = await this.aggregator.aggregate(patientId, limit);
    await this.audit.log('TIMELINE_QUERIED', { userId: actor?.sub, metadata: { patientId, count: events.length } });
    return events;
  }

  async getSummary(patientId: string, actor?: Actor): Promise<PatientTimelineSummary> {
    if (actor) await this.assertAccess(patientId, actor);
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

    await this.audit.log('SUMMARY_QUERIED', { userId: actor?.sub, metadata: { patientId } });
    return summary;
  }

  async getEvents(patientId: string, filters: Partial<TimelineEventFilters> = {}, actor?: Actor) {
    if (actor) await this.assertAccess(patientId, actor);
    const events = await this.repo.findByPatient({ ...filters, patientId });
    await this.audit.log('TIMELINE_QUERIED', { userId: actor?.sub, metadata: { patientId, source: 'events' } });
    return events;
  }

  /** Achado da Sprint 04 (Fase 2/3 — validação Web→API e isolamento entre
   * usuários): `userId` era usado só para auditoria, nunca para autorização —
   * qualquer usuário autenticado lia o resumo/timeline/eventos clínicos de
   * QUALQUER paciente pelo `patientId` na URL (mesma classe de IDOR corrigida
   * em outros módulos na Sprint 03; este módulo não fazia parte daquele
   * escopo). Mesmo padrão: ADMIN bypassa; PATIENT só o próprio; PROFESSIONAL/
   * DOCTOR só paciente vinculado via `primaryProfessionalId`. */
  private async assertAccess(patientId: string, actor: Actor): Promise<void> {
    if (actor.role === 'ADMIN') return;

    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, deletedAt: null } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    if (actor.role === 'PATIENT') {
      if (patient.userId !== actor.sub) throw new ForbiddenException('Acesso negado');
      return;
    }

    if (actor.role === 'PROFESSIONAL' || actor.role === 'DOCTOR') {
      const professional = await this.prisma.professional.findFirst({ where: { userId: actor.sub, deletedAt: null } });
      if (!professional || patient.primaryProfessionalId !== professional.id) {
        throw new ForbiddenException('Profissional sem vínculo com este paciente');
      }
      return;
    }

    throw new ForbiddenException();
  }
}
