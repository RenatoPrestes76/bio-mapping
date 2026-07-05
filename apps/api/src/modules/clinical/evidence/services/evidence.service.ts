import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { EvidenceType, AssessmentStatus } from '@bio/database';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../../common/audit/audit-log.service';
import { EVIDENCE_STORAGE, EvidenceStorageProvider } from '../providers/storage.interface';
import { EvidenceResponseDto, toEvidenceResponse } from '../dto/evidence-response.dto';

interface Actor { sub: string; role: string }

const MIME_TYPE_MAP: Record<string, EvidenceType> = {
  'image/jpeg': 'PHOTO',
  'image/png': 'PHOTO',
  'image/webp': 'PHOTO',
  'application/pdf': 'PDF',
  'video/mp4': 'VIDEO',
  'video/quicktime': 'VIDEO',
  'audio/mpeg': 'AUDIO',
  'audio/wav': 'AUDIO',
  'application/msword': 'DOCUMENT',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
};

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    @Inject(EVIDENCE_STORAGE) private readonly storage: EvidenceStorageProvider,
  ) {}

  async upload(
    assessmentId: string,
    file: Express.Multer.File,
    actor: Actor,
    context: AuditContext,
  ): Promise<EvidenceResponseDto> {
    const assessment = await this.findAssessmentOrFail(assessmentId);

    if (assessment.status === AssessmentStatus.LOCKED) {
      throw new UnprocessableEntityException('Não é possível adicionar evidências a avaliações bloqueadas');
    }

    await this.assertWriteAccess(assessment, actor);

    const evidenceType: EvidenceType = MIME_TYPE_MAP[file.mimetype] ?? 'DOCUMENT';
    const stored = await this.storage.save(file, assessmentId);

    const evidence = await this.prisma.assessmentEvidence.create({
      data: {
        assessmentId,
        type: evidenceType,
        filename: stored.filename,
        originalName: file.originalname,
        mimeType: stored.mimeType,
        size: stored.size,
        url: stored.url,
        uploadedBy: actor.sub,
      },
    });

    await this.audit.log('EVIDENCE_UPLOADED', {
      ...context,
      userId: actor.sub,
      metadata: { assessmentId, evidenceId: evidence.id, type: evidenceType },
    });

    return toEvidenceResponse(evidence);
  }

  async findAll(assessmentId: string, actor: Actor): Promise<EvidenceResponseDto[]> {
    const assessment = await this.findAssessmentOrFail(assessmentId);
    await this.assertReadAccess(assessment, actor);

    const evidence = await this.prisma.assessmentEvidence.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' },
    });

    return evidence.map(toEvidenceResponse);
  }

  async remove(assessmentId: string, evidenceId: string, actor: Actor, context: AuditContext): Promise<void> {
    const assessment = await this.findAssessmentOrFail(assessmentId);

    if (assessment.status === AssessmentStatus.LOCKED) {
      throw new UnprocessableEntityException('Não é possível remover evidências de avaliações bloqueadas');
    }

    await this.assertWriteAccess(assessment, actor);

    const evidence = await this.prisma.assessmentEvidence.findFirst({ where: { id: evidenceId, assessmentId } });
    if (!evidence) throw new NotFoundException('Evidência não encontrada');

    await this.storage.delete(evidence.filename, assessmentId);
    await this.prisma.assessmentEvidence.delete({ where: { id: evidenceId } });

    await this.audit.log('EVIDENCE_DELETED', {
      ...context,
      userId: actor.sub,
      metadata: { assessmentId, evidenceId },
    });
  }

  // ── Access helpers ────────────────────────────────────────────────────────

  private async findAssessmentOrFail(assessmentId: string) {
    const a = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
      include: { patient: true },
    });
    if (!a) throw new NotFoundException('Avaliação não encontrada');
    return a;
  }

  private async assertReadAccess(assessment: any, actor: Actor) {
    if (actor.role === 'ADMIN') return;
    if (actor.role === 'PATIENT') {
      if (assessment.patient?.userId !== actor.sub) throw new ForbiddenException();
      return;
    }
  }

  private async assertWriteAccess(assessment: any, actor: Actor) {
    if (actor.role === 'ADMIN') return;
    if (actor.role === 'PATIENT') {
      if (assessment.patient?.userId !== actor.sub) throw new ForbiddenException();
      return;
    }
    if (actor.role === 'PROFESSIONAL' || actor.role === 'DOCTOR') return;
    throw new ForbiddenException();
  }
}
