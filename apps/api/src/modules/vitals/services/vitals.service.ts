import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { VitalRecord, VitalStatus, Prisma } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../common/audit/audit-log.service';
import { paginated, PaginatedResponse } from '../../../common/dto/pagination.dto';
import { VitalsRepository } from '../repositories/vitals.repository';
import { VitalCalculationsService } from './vital-calculations.service';
import { CreateVitalRecordDto } from '../dto/create-vital-record.dto';
import { UpdateVitalRecordDto } from '../dto/update-vital-record.dto';
import { FilterVitalsDto } from '../dto/filter-vitals.dto';
import { VitalRecordResponseDto, toVitalRecordResponse } from '../dto/vital-record-response.dto';

interface Actor {
  sub: string;
  role: string;
}

// Campos que geram entrada no histórico quando alterados
const TRACKED_FIELDS: (keyof UpdateVitalRecordDto)[] = [
  'height', 'weight', 'bodyFatPercentage', 'leanMass', 'fatMass', 'visceralFat',
  'waistCircumference', 'hipCircumference', 'neckCircumference', 'chestCircumference',
  'armCircumference', 'thighCircumference', 'calfCircumference',
  'heartRate', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'respiratoryRate',
  'bodyTemperature', 'oxygenSaturation', 'bloodGlucose',
  'status', 'source', 'notes', 'recordedAt',
];

@Injectable()
export class VitalsService {
  constructor(
    private readonly repo: VitalsRepository,
    private readonly prisma: PrismaService,
    private readonly calculations: VitalCalculationsService,
    private readonly audit: AuditLogService,
  ) {}

  async create(
    patientId: string,
    dto: CreateVitalRecordDto,
    actor: Actor,
    context: AuditContext,
  ): Promise<VitalRecordResponseDto> {
    const patient = await this.findPatientOrFail(patientId);
    await this.assertWriteAccess(patient, actor);

    const bmi = dto.weight && dto.height
      ? this.calculations.calculateBmi(dto.weight, dto.height)
      : undefined;

    const record = await this.repo.create({
      patient: { connect: { id: patientId } },
      recordedAt: new Date(dto.recordedAt),
      source: dto.source,
      status: dto.status,
      notes: dto.notes,
      professional: dto.professionalId ? { connect: { id: dto.professionalId } } : undefined,
      organization: dto.organizationId ? { connect: { id: dto.organizationId } } : undefined,
      height: dto.height,
      weight: dto.weight,
      bmi,
      bodyFatPercentage: dto.bodyFatPercentage,
      leanMass: dto.leanMass,
      fatMass: dto.fatMass,
      visceralFat: dto.visceralFat,
      waistCircumference: dto.waistCircumference,
      hipCircumference: dto.hipCircumference,
      neckCircumference: dto.neckCircumference,
      chestCircumference: dto.chestCircumference,
      armCircumference: dto.armCircumference,
      thighCircumference: dto.thighCircumference,
      calfCircumference: dto.calfCircumference,
      heartRate: dto.heartRate,
      bloodPressureSystolic: dto.bloodPressureSystolic,
      bloodPressureDiastolic: dto.bloodPressureDiastolic,
      respiratoryRate: dto.respiratoryRate,
      bodyTemperature: dto.bodyTemperature,
      oxygenSaturation: dto.oxygenSaturation,
      bloodGlucose: dto.bloodGlucose,
    });

    await this.audit.log('VITAL_CREATED', {
      ...context,
      userId: actor.sub,
      metadata: { vitalRecordId: record.id, patientId },
    });

    return toVitalRecordResponse(record as any);
  }

  async findAll(
    patientId: string,
    dto: FilterVitalsDto,
    actor: Actor,
  ): Promise<PaginatedResponse<VitalRecordResponseDto>> {
    const patient = await this.findPatientOrFail(patientId);
    await this.assertReadAccess(patient, actor);

    const [records, total] = await this.repo.findAll(patientId, dto);
    return paginated(
      records.map((r) => toVitalRecordResponse(r as any)),
      total,
      dto.page ?? 1,
      dto.limit ?? 20,
    );
  }

  async findOne(id: string, actor: Actor): Promise<VitalRecordResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Registro vital não encontrado');

    const patient = await this.findPatientOrFail(record.patientId);
    await this.assertReadAccess(patient, actor);

    return toVitalRecordResponse(record as any);
  }

  async update(
    id: string,
    dto: UpdateVitalRecordDto,
    actor: Actor,
    context: AuditContext,
  ): Promise<VitalRecordResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Registro vital não encontrado');

    const patient = await this.findPatientOrFail(record.patientId);
    await this.assertWriteAccess(patient, actor);

    if (record.status === 'ARCHIVED') {
      throw new UnprocessableEntityException('Registros arquivados não podem ser editados');
    }

    // Gera histórico de alterações — dados clínicos nunca são sobrescritos silenciosamente
    const historyEntries: Prisma.VitalRecordHistoryCreateManyInput[] = [];
    for (const field of TRACKED_FIELDS) {
      const newValue = (dto as any)[field];
      if (newValue === undefined) continue;
      const previousValue = (record as any)[field];
      const prevStr = previousValue !== null && previousValue !== undefined
        ? String(previousValue)
        : null;
      const newStr = String(newValue);
      if (prevStr !== newStr) {
        historyEntries.push({
          vitalRecordId: id,
          field,
          previousValue: prevStr,
          newValue: newStr,
          changedBy: actor.sub,
        });
      }
    }

    // Recalcula BMI se peso ou altura forem alterados
    const updateData: Prisma.VitalRecordUpdateInput = { ...dto } as any;
    if (dto.recordedAt) updateData.recordedAt = new Date(dto.recordedAt);

    const effectiveWeight = dto.weight ?? record.weight;
    const effectiveHeight = dto.height ?? record.height;
    if (effectiveWeight && effectiveHeight) {
      updateData.bmi = this.calculations.calculateBmi(effectiveWeight, effectiveHeight);
    }

    const updated = await this.repo.update(id, updateData, historyEntries);

    await this.audit.log('VITAL_UPDATED', {
      ...context,
      userId: actor.sub,
      metadata: { vitalRecordId: id, changesCount: historyEntries.length },
    });

    return toVitalRecordResponse(updated as any);
  }

  async validate(
    id: string,
    actor: Actor,
    context: AuditContext,
  ): Promise<VitalRecordResponseDto> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Registro vital não encontrado');

    if (actor.role === 'PATIENT') {
      throw new ForbiddenException('Pacientes não podem validar registros');
    }

    if (record.status === VitalStatus.VALIDATED) {
      throw new UnprocessableEntityException('Registro já está validado');
    }

    const historyEntry: Prisma.VitalRecordHistoryCreateManyInput = {
      vitalRecordId: id,
      field: 'status',
      previousValue: record.status,
      newValue: VitalStatus.VALIDATED,
      changedBy: actor.sub,
    };

    const updated = await this.repo.update(
      id,
      { status: VitalStatus.VALIDATED },
      [historyEntry],
    );

    await this.audit.log('VITAL_VALIDATED', {
      ...context,
      userId: actor.sub,
      metadata: { vitalRecordId: id },
    });

    return toVitalRecordResponse(updated as any);
  }

  async remove(id: string, actor: Actor, context: AuditContext): Promise<void> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('Registro vital não encontrado');

    const patient = await this.findPatientOrFail(record.patientId);
    await this.assertWriteAccess(patient, actor);

    await this.repo.softDelete(id);

    await this.audit.log('VITAL_DELETED', {
      ...context,
      userId: actor.sub,
      metadata: { vitalRecordId: id },
    });
  }

  // ── Controle de acesso multi-tenant ──────────────────────────────────────

  private async findPatientOrFail(patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return patient;
  }

  private async assertReadAccess(
    patient: { userId: string; primaryProfessionalId: string | null },
    actor: Actor,
  ): Promise<void> {
    if (actor.role === 'ADMIN') return;

    if (actor.role === 'PATIENT') {
      if (patient.userId !== actor.sub) {
        throw new ForbiddenException('Acesso negado a registros de outro paciente');
      }
      return;
    }

    if (actor.role === 'PROFESSIONAL' || actor.role === 'DOCTOR') {
      await this.assertProfessionalAccess(patient, actor.sub);
      return;
    }

    throw new ForbiddenException();
  }

  private async assertWriteAccess(
    patient: { userId: string; primaryProfessionalId: string | null },
    actor: Actor,
  ): Promise<void> {
    if (actor.role === 'ADMIN') return;

    // Paciente pode registrar seus próprios vitais
    if (actor.role === 'PATIENT') {
      if (patient.userId !== actor.sub) {
        throw new ForbiddenException('Acesso negado a registros de outro paciente');
      }
      return;
    }

    if (actor.role === 'PROFESSIONAL' || actor.role === 'DOCTOR') {
      await this.assertProfessionalAccess(patient, actor.sub);
      return;
    }

    throw new ForbiddenException();
  }

  private async assertProfessionalAccess(
    patient: { primaryProfessionalId: string | null },
    actorUserId: string,
  ): Promise<void> {
    const professional = await this.prisma.professional.findFirst({
      where: { userId: actorUserId, deletedAt: null },
    });
    if (!professional) throw new ForbiddenException('Profissional não cadastrado');

    if (patient.primaryProfessionalId !== professional.id) {
      // Verifica se há vínculo por membership na mesma organização
      const sharedOrg = await this.prisma.membership.findFirst({
        where: {
          userId: actorUserId,
          deletedAt: null,
        },
      });
      if (!sharedOrg) {
        throw new ForbiddenException('Profissional sem vínculo com este paciente');
      }
    }
  }
}
