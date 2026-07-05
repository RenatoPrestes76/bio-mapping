import {
  ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { AssessmentStatus, Prisma } from '@bio/database';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../../common/audit/audit-log.service';
import { paginated, PaginatedResponse } from '../../../../common/dto/pagination.dto';
import { ScoringService } from '../../scoring/services/scoring.service';
import { AssessmentsRepository } from '../repositories/assessments.repository';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { FilterAssessmentsDto } from '../dto/filter-assessments.dto';
import { AssessmentResponseDto, toAssessmentResponse } from '../dto/assessment-response.dto';
import { AssessmentSummaryDto } from '../dto/assessment-summary.dto';

interface Actor { sub: string; role: string }

const LOCKED_GUARD = 'Avaliações bloqueadas não podem ser editadas. Crie uma nova avaliação.';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly repo: AssessmentsRepository,
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly audit: AuditLogService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────────

  async create(
    patientId: string,
    dto: CreateAssessmentDto,
    actor: Actor,
    context: AuditContext,
  ): Promise<AssessmentResponseDto> {
    const patient = await this.findPatientOrFail(patientId);
    await this.assertWriteAccess(patient, actor);

    const template = await this.prisma.assessmentTemplate.findFirst({
      where: { id: dto.templateId, deletedAt: null, isActive: true },
    });
    if (!template) throw new NotFoundException('Template de avaliação não encontrado');

    const assessment = await this.repo.create({
      patient: { connect: { id: patientId } },
      template: { connect: { id: dto.templateId } },
      professional: dto.professionalId ? { connect: { id: dto.professionalId } } : undefined,
      organization: dto.organizationId ? { connect: { id: dto.organizationId } } : undefined,
      performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
      notes: dto.notes,
      status: AssessmentStatus.DRAFT,
    });

    await this.audit.log('ASSESSMENT_CREATED', {
      ...context,
      userId: actor.sub,
      metadata: { assessmentId: assessment.id, patientId, templateId: dto.templateId },
    });

    return toAssessmentResponse(assessment);
  }

  // ── Find all (by patient) ────────────────────────────────────────────────

  async findAll(
    patientId: string,
    dto: FilterAssessmentsDto,
    actor: Actor,
  ): Promise<PaginatedResponse<AssessmentResponseDto>> {
    const patient = await this.findPatientOrFail(patientId);
    await this.assertReadAccess(patient, actor);

    const [assessments, total] = await this.repo.findAll(patientId, dto);
    return paginated(
      assessments.map(toAssessmentResponse),
      total,
      dto.page ?? 1,
      dto.limit ?? 20,
    );
  }

  // ── Search (admin / professional global search) ──────────────────────────

  async search(dto: FilterAssessmentsDto, actor: Actor): Promise<PaginatedResponse<AssessmentResponseDto>> {
    if (actor.role === 'PATIENT') throw new ForbiddenException('Pacientes não podem fazer busca global de avaliações');

    const [assessments, total] = await this.repo.findAllFiltered(dto);
    return paginated(
      assessments.map(toAssessmentResponse),
      total,
      dto.page ?? 1,
      dto.limit ?? 20,
    );
  }

  // ── Find one ────────────────────────────────────────────────────────────

  async findOne(id: string, actor: Actor): Promise<AssessmentResponseDto> {
    const assessment = await this.repo.findById(id);
    if (!assessment) throw new NotFoundException('Avaliação não encontrada');

    const patient = await this.findPatientOrFail(assessment.patientId);
    await this.assertReadAccess(patient, actor);

    return toAssessmentResponse(assessment);
  }

  // ── Update (answers + notes) ─────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateAssessmentDto,
    actor: Actor,
    context: AuditContext,
  ): Promise<AssessmentResponseDto> {
    const assessment = await this.repo.findById(id);
    if (!assessment) throw new NotFoundException('Avaliação não encontrada');

    const patient = await this.findPatientOrFail(assessment.patientId);
    await this.assertWriteAccess(patient, actor);

    if (assessment.status === AssessmentStatus.LOCKED) throw new UnprocessableEntityException(LOCKED_GUARD);

    const historyEntries: Prisma.AssessmentHistoryCreateManyInput[] = [];

    if (dto.notes !== undefined && dto.notes !== assessment.notes) {
      historyEntries.push({ assessmentId: id, field: 'notes', previousValue: assessment.notes, newValue: dto.notes, changedBy: actor.sub, ip: context.ip, userAgent: context.userAgent });
    }

    const updateData: Prisma.AssessmentUpdateInput = {
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.performedAt && { performedAt: new Date(dto.performedAt) }),
      status: AssessmentStatus.IN_PROGRESS,
    };

    const updated = await this.repo.update(id, updateData, historyEntries);

    if (dto.answers?.length) {
      await this.repo.upsertAnswers(id, dto.answers);
    }

    await this.audit.log('ASSESSMENT_UPDATED', {
      ...context,
      userId: actor.sub,
      metadata: { assessmentId: id, answersCount: dto.answers?.length ?? 0 },
    });

    return toAssessmentResponse(updated);
  }

  // ── Complete (calculate scores) ──────────────────────────────────────────

  async complete(id: string, actor: Actor, context: AuditContext): Promise<AssessmentResponseDto> {
    const assessment = await this.repo.findById(id);
    if (!assessment) throw new NotFoundException('Avaliação não encontrada');

    if (assessment.status === AssessmentStatus.LOCKED) throw new UnprocessableEntityException(LOCKED_GUARD);
    if (assessment.status === AssessmentStatus.VALIDATED) throw new UnprocessableEntityException('Avaliação já validada');

    const patient = await this.findPatientOrFail(assessment.patientId);
    await this.assertWriteAccess(patient, actor);

    // Gather all fields from template sections
    const template = assessment.template as any;
    const fields = (template?.sections ?? []).flatMap((s: any) => s.fields ?? []);
    const sections = (template?.sections ?? []).map((s: any) => ({ id: s.id, title: s.title, order: s.order }));

    const result = this.scoring.calculate(template?.scoringEngine ?? 'weighted-sum', {
      answers: (assessment.answers as any[]).map((a) => ({ fieldId: a.fieldId, value: a.value, score: a.score })),
      fields: fields.map((f: any) => ({ id: f.id, sectionId: f.sectionId, label: f.label, scoringWeight: f.scoringWeight, min: f.min, max: f.max, required: f.required })),
      sections,
      config: (template?.scoringConfig as Record<string, unknown>) ?? undefined,
    });

    const historyEntry: Prisma.AssessmentHistoryCreateManyInput = {
      assessmentId: id, field: 'status',
      previousValue: assessment.status, newValue: AssessmentStatus.COMPLETED,
      changedBy: actor.sub, ip: context.ip, userAgent: context.userAgent,
    };

    const updated = await this.repo.update(id, {
      status: AssessmentStatus.COMPLETED,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      scorePercent: result.percentage,
      classification: result.classification,
      riskLevel: result.riskLevel,
    }, [historyEntry]);

    await this.audit.log('ASSESSMENT_COMPLETED', {
      ...context,
      userId: actor.sub,
      metadata: { assessmentId: id, score: result.totalScore, percentage: result.percentage },
    });

    return toAssessmentResponse(updated);
  }

  // ── Validate ─────────────────────────────────────────────────────────────

  async validate(id: string, actor: Actor, context: AuditContext): Promise<AssessmentResponseDto> {
    if (actor.role === 'PATIENT') throw new ForbiddenException('Pacientes não podem validar avaliações');

    const assessment = await this.repo.findById(id);
    if (!assessment) throw new NotFoundException('Avaliação não encontrada');

    if (assessment.status === AssessmentStatus.LOCKED) throw new UnprocessableEntityException(LOCKED_GUARD);
    if (assessment.status !== AssessmentStatus.COMPLETED) {
      throw new UnprocessableEntityException('Apenas avaliações com status COMPLETED podem ser validadas');
    }

    const historyEntry: Prisma.AssessmentHistoryCreateManyInput = {
      assessmentId: id, field: 'status',
      previousValue: assessment.status, newValue: AssessmentStatus.VALIDATED,
      changedBy: actor.sub, ip: context.ip, userAgent: context.userAgent,
    };

    const updated = await this.repo.update(id, {
      status: AssessmentStatus.VALIDATED,
      validatedAt: new Date(),
    }, [historyEntry]);

    await this.audit.log('ASSESSMENT_VALIDATED', {
      ...context,
      userId: actor.sub,
      metadata: { assessmentId: id },
    });

    return toAssessmentResponse(updated);
  }

  // ── Lock ─────────────────────────────────────────────────────────────────

  async lock(id: string, actor: Actor, context: AuditContext): Promise<AssessmentResponseDto> {
    if (actor.role === 'PATIENT') throw new ForbiddenException('Pacientes não podem bloquear avaliações');

    const assessment = await this.repo.findById(id);
    if (!assessment) throw new NotFoundException('Avaliação não encontrada');

    if (assessment.status === AssessmentStatus.LOCKED) throw new UnprocessableEntityException('Avaliação já está bloqueada');
    if (assessment.status !== AssessmentStatus.VALIDATED) {
      throw new UnprocessableEntityException('Apenas avaliações com status VALIDATED podem ser bloqueadas');
    }

    const historyEntry: Prisma.AssessmentHistoryCreateManyInput = {
      assessmentId: id, field: 'status',
      previousValue: assessment.status, newValue: AssessmentStatus.LOCKED,
      changedBy: actor.sub, ip: context.ip, userAgent: context.userAgent,
    };

    const updated = await this.repo.update(id, {
      status: AssessmentStatus.LOCKED,
      lockedAt: new Date(),
      lockedBy: actor.sub,
    }, [historyEntry]);

    await this.audit.log('ASSESSMENT_LOCKED', {
      ...context,
      userId: actor.sub,
      metadata: { assessmentId: id },
    });

    return toAssessmentResponse(updated);
  }

  // ── Remove ───────────────────────────────────────────────────────────────

  async remove(id: string, actor: Actor, context: AuditContext): Promise<void> {
    const assessment = await this.repo.findById(id);
    if (!assessment) throw new NotFoundException('Avaliação não encontrada');

    if (assessment.status === AssessmentStatus.LOCKED) throw new UnprocessableEntityException(LOCKED_GUARD);

    const patient = await this.findPatientOrFail(assessment.patientId);
    await this.assertWriteAccess(patient, actor);

    await this.repo.softDelete(id);

    await this.audit.log('ASSESSMENT_DELETED', {
      ...context,
      userId: actor.sub,
      metadata: { assessmentId: id },
    });
  }

  // ── Summary dashboard ────────────────────────────────────────────────────

  async summary(patientId: string, actor: Actor): Promise<AssessmentSummaryDto> {
    const patient = await this.findPatientOrFail(patientId);
    await this.assertReadAccess(patient, actor);

    const assessments = await this.prisma.assessment.findMany({
      where: { patientId, deletedAt: null },
      include: { template: true },
      orderBy: { performedAt: 'desc' },
    });

    const byStatus = (s: string) => assessments.filter((a) => a.status === s).length;
    const last = assessments[0];
    const uniqueCategories = [...new Set(assessments.map((a) => (a.template as any)?.category).filter(Boolean))];
    const uniqueProfessionals = [...new Set(assessments.map((a) => a.professionalId).filter(Boolean))] as string[];

    const scoreEvolution = assessments
      .filter((a) => a.totalScore !== null && a.performedAt !== null)
      .map((a) => ({
        date: a.performedAt as Date,
        score: a.totalScore as number,
        percentage: a.scorePercent ?? 0,
        templateName: (a.template as any)?.name ?? '',
        category: (a.template as any)?.category ?? '',
      }));

    return {
      totalAssessments: assessments.length,
      draftCount: byStatus('DRAFT'),
      inProgressCount: byStatus('IN_PROGRESS'),
      completedCount: byStatus('COMPLETED'),
      validatedCount: byStatus('VALIDATED'),
      lockedCount: byStatus('LOCKED'),
      lastAssessment: last
        ? {
            id: last.id,
            templateName: (last.template as any)?.name ?? '',
            category: (last.template as any)?.category ?? '',
            status: last.status,
            performedAt: last.performedAt,
          }
        : null,
      categoriesAssessed: uniqueCategories,
      professionalsInvolved: uniqueProfessionals,
      scoreEvolution,
    };
  }

  // ── Timeline ─────────────────────────────────────────────────────────────

  async timeline(patientId: string, actor: Actor) {
    const patient = await this.findPatientOrFail(patientId);
    await this.assertReadAccess(patient, actor);

    const [vitals, assessments] = await this.prisma.$transaction([
      this.prisma.vitalRecord.findMany({
        where: { patientId, deletedAt: null },
        orderBy: { recordedAt: 'desc' },
        take: 50,
        select: { id: true, recordedAt: true, status: true, source: true, notes: true },
      }),
      this.prisma.assessment.findMany({
        where: { patientId, deletedAt: null },
        orderBy: { performedAt: 'desc' },
        take: 50,
        include: { template: { select: { name: true, category: true } } },
      }),
    ]);

    const vitalEvents = vitals.map((v) => ({
      id: v.id,
      type: 'VITAL_RECORD' as const,
      title: 'Registro de Sinais Vitais',
      description: v.notes ?? 'Sinais vitais registrados',
      date: v.recordedAt,
      status: v.status,
      metadata: { source: v.source },
    }));

    const assessmentEvents = assessments.map((a) => ({
      id: a.id,
      type: 'ASSESSMENT' as const,
      title: `Avaliação: ${(a.template as any)?.name ?? ''}`,
      description: `Categoria: ${(a.template as any)?.category ?? ''}`,
      date: a.performedAt ?? a.createdAt,
      status: a.status,
      metadata: { score: a.totalScore, percentage: a.scorePercent, classification: a.classification },
    }));

    return [...vitalEvents, ...assessmentEvents].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ── Controle de acesso multi-tenant ──────────────────────────────────────

  private async findPatientOrFail(patientId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, deletedAt: null } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return patient;
  }

  private async assertReadAccess(patient: { userId: string; primaryProfessionalId: string | null }, actor: Actor) {
    if (actor.role === 'ADMIN') return;
    if (actor.role === 'PATIENT') {
      if (patient.userId !== actor.sub) throw new ForbiddenException('Acesso negado');
      return;
    }
    if (actor.role === 'PROFESSIONAL' || actor.role === 'DOCTOR') {
      await this.assertProfessionalAccess(patient, actor.sub);
      return;
    }
    throw new ForbiddenException();
  }

  private async assertWriteAccess(patient: { userId: string; primaryProfessionalId: string | null }, actor: Actor) {
    if (actor.role === 'ADMIN') return;
    if (actor.role === 'PATIENT') {
      if (patient.userId !== actor.sub) throw new ForbiddenException('Acesso negado');
      return;
    }
    if (actor.role === 'PROFESSIONAL' || actor.role === 'DOCTOR') {
      await this.assertProfessionalAccess(patient, actor.sub);
      return;
    }
    throw new ForbiddenException();
  }

  private async assertProfessionalAccess(patient: { primaryProfessionalId: string | null }, actorUserId: string) {
    const professional = await this.prisma.professional.findFirst({ where: { userId: actorUserId, deletedAt: null } });
    if (!professional) throw new ForbiddenException('Profissional não cadastrado');

    if (patient.primaryProfessionalId !== professional.id) {
      const sharedOrg = await this.prisma.membership.findFirst({ where: { userId: actorUserId, deletedAt: null } });
      if (!sharedOrg) throw new ForbiddenException('Profissional sem vínculo com este paciente');
    }
  }
}
