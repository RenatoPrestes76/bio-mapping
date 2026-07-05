import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BiomarkerStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../common/audit/audit-log.service';
import { CreateBiomarkerDto } from '../dto/create-biomarker.dto';
import { UpdateBiomarkerDto } from '../dto/update-biomarker.dto';
import { BiomarkerResponseDto, toBiomarkerResponse } from '../dto/biomarker-response.dto';

interface Actor {
  sub: string;
  role: string;
}

@Injectable()
export class BiomarkersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async create(
    vitalRecordId: string,
    dto: CreateBiomarkerDto,
    actor: Actor,
    context: AuditContext,
  ): Promise<BiomarkerResponseDto> {
    const record = await this.findVitalRecordOrFail(vitalRecordId);
    await this.assertAccess(record, actor);

    // Derive status automatically from reference range if not explicitly provided
    const status = dto.status ?? this.deriveStatus(dto.value, dto.referenceMin, dto.referenceMax);

    const biomarker = await this.prisma.biomarker.create({
      data: {
        vitalRecordId,
        name: dto.name,
        value: dto.value,
        unit: dto.unit,
        referenceMin: dto.referenceMin,
        referenceMax: dto.referenceMax,
        status,
        notes: dto.notes,
      },
    });

    await this.audit.log('BIOMARKER_CREATED', {
      ...context,
      userId: actor.sub,
      metadata: { biomarkerId: biomarker.id, vitalRecordId, name: dto.name },
    });

    return toBiomarkerResponse(biomarker);
  }

  async findAll(vitalRecordId: string, actor: Actor): Promise<BiomarkerResponseDto[]> {
    const record = await this.findVitalRecordOrFail(vitalRecordId);
    await this.assertAccess(record, actor);

    const biomarkers = await this.prisma.biomarker.findMany({
      where: { vitalRecordId },
      orderBy: { name: 'asc' },
    });

    return biomarkers.map(toBiomarkerResponse);
  }

  async update(
    id: string,
    dto: UpdateBiomarkerDto,
    actor: Actor,
    context: AuditContext,
  ): Promise<BiomarkerResponseDto> {
    const biomarker = await this.prisma.biomarker.findUnique({ where: { id } });
    if (!biomarker) throw new NotFoundException('Biomarcador não encontrado');

    const record = await this.findVitalRecordOrFail(biomarker.vitalRecordId);
    await this.assertAccess(record, actor);

    const newValue = dto.value ?? biomarker.value;
    const newMin = dto.referenceMin ?? biomarker.referenceMin;
    const newMax = dto.referenceMax ?? biomarker.referenceMax;

    const status = dto.status ?? this.deriveStatus(newValue, newMin ?? undefined, newMax ?? undefined);

    const updated = await this.prisma.biomarker.update({
      where: { id },
      data: { ...dto, status },
    });

    await this.audit.log('BIOMARKER_UPDATED', {
      ...context,
      userId: actor.sub,
      metadata: { biomarkerId: id },
    });

    return toBiomarkerResponse(updated);
  }

  async remove(id: string, actor: Actor, context: AuditContext): Promise<void> {
    const biomarker = await this.prisma.biomarker.findUnique({ where: { id } });
    if (!biomarker) throw new NotFoundException('Biomarcador não encontrado');

    const record = await this.findVitalRecordOrFail(biomarker.vitalRecordId);
    await this.assertAccess(record, actor);

    await this.prisma.biomarker.delete({ where: { id } });

    await this.audit.log('BIOMARKER_DELETED', {
      ...context,
      userId: actor.sub,
      metadata: { biomarkerId: id },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async findVitalRecordOrFail(vitalRecordId: string) {
    const record = await this.prisma.vitalRecord.findFirst({
      where: { id: vitalRecordId, deletedAt: null },
      include: { patient: { select: { userId: true, primaryProfessionalId: true } } },
    });
    if (!record) throw new NotFoundException('Registro vital não encontrado');
    return record;
  }

  private async assertAccess(record: any, actor: Actor): Promise<void> {
    if (actor.role === 'ADMIN') return;

    if (actor.role === 'PATIENT') {
      if (record.patient.userId !== actor.sub) {
        throw new ForbiddenException('Acesso negado');
      }
      return;
    }

    if (actor.role === 'PROFESSIONAL' || actor.role === 'DOCTOR') {
      const professional = await this.prisma.professional.findFirst({
        where: { userId: actor.sub, deletedAt: null },
      });
      if (!professional) throw new ForbiddenException('Profissional não cadastrado');
      if (record.patient.primaryProfessionalId !== professional.id) {
        const membership = await this.prisma.membership.findFirst({
          where: { userId: actor.sub, deletedAt: null },
        });
        if (!membership) throw new ForbiddenException('Sem vínculo com este paciente');
      }
      return;
    }

    throw new ForbiddenException();
  }

  // Deriva o status do biomarcador automaticamente com base nos valores de referência.
  // CRITICAL é reservado para configuração manual (ex: laudo médico).
  private deriveStatus(
    value: number,
    referenceMin?: number,
    referenceMax?: number,
  ): BiomarkerStatus {
    if (referenceMin === undefined && referenceMax === undefined) return BiomarkerStatus.NORMAL;
    if (referenceMin !== undefined && value < referenceMin) return BiomarkerStatus.LOW;
    if (referenceMax !== undefined && value > referenceMax) return BiomarkerStatus.HIGH;
    return BiomarkerStatus.NORMAL;
  }
}
