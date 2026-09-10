import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { BloodType } from '@bio/database';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { PatientResponseDto, toPatientResponse } from './dto/patient-response.dto';
import { paginated, PaginatedResponse } from '../../common/dto/pagination.dto';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  private generateRegistrationCode(): string {
    return 'PAT-' + randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Dono (PATIENT) sempre pode acessar o próprio registro. ADMIN sempre pode.
   * PROFESSIONAL/DOCTOR só se forem o profissional responsável (primaryProfessionalId) —
   * sem fallback de "qualquer membership em qualquer org", que era a brecha original
   * (achado da Sprint 03: qualquer usuário autenticado lia/escrevia qualquer paciente).
   */
  private assertAccess(patient: { userId: string; primaryProfessionalId: string | null }, actor: JwtPayload): void {
    if (actor.role === 'ADMIN') return;
    if (actor.role === 'PATIENT') {
      if (patient.userId !== actor.sub) throw new ForbiddenException('Acesso negado a este paciente');
      return;
    }
    if (patient.primaryProfessionalId !== actor.sub) {
      throw new ForbiddenException('Acesso negado a este paciente');
    }
  }

  async create(userId: string, dto: CreatePatientDto): Promise<PatientResponseDto> {
    const existing = await this.prisma.patient.findFirst({ where: { userId, deletedAt: null } });
    if (existing) throw new ConflictException('Registro de paciente já existe para este usuário');

    const patient = await this.prisma.patient.create({
      data: {
        userId,
        registrationCode: this.generateRegistrationCode(),
        bloodType: dto.bloodType as BloodType | undefined,
        height: dto.height,
        weight: dto.weight,
        primaryProfessionalId: dto.primaryProfessionalId,
        notes: dto.notes,
      },
    });

    await this.auditLog.log('PATIENT_CREATED', { userId, metadata: { patientId: patient.id } });
    return toPatientResponse(patient);
  }

  async findAll(dto: SearchPatientsDto, actor: JwtPayload): Promise<PaginatedResponse<PatientResponseDto>> {
    // PATIENT não tem motivo legítimo para navegar o roster inteiro de pacientes da
    // plataforma — só pode ver o próprio registro (via /patients/:id, com o próprio id).
    if (actor.role === 'PATIENT') throw new ForbiddenException('Acesso negado');

    const { page = 1, limit = 20, name, organizationId } = dto;
    const where: any = { deletedAt: null };
    if (name) where.user = { name: { contains: name, mode: 'insensitive' }, deletedAt: null };
    if (organizationId) {
      where.user = { ...where.user, memberships: { some: { organizationId, deletedAt: null } } };
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return paginated(patients.map(toPatientResponse), total, page, limit);
  }

  async findById(id: string, actor: JwtPayload): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    this.assertAccess(patient, actor);
    return toPatientResponse(patient);
  }

  async update(id: string, dto: UpdatePatientDto, actor: JwtPayload): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findFirst({ where: { id, deletedAt: null } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    this.assertAccess(patient, actor);

    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        bloodType: dto.bloodType as BloodType | undefined,
        height: dto.height,
        weight: dto.weight,
        primaryProfessionalId: dto.primaryProfessionalId,
        notes: dto.notes,
      },
    });

    await this.auditLog.log('PATIENT_UPDATED', { userId: actor.sub, metadata: { patientId: id } });
    return toPatientResponse(updated);
  }

  async delete(id: string, actor: JwtPayload): Promise<void> {
    const patient = await this.prisma.patient.findFirst({ where: { id, deletedAt: null } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    this.assertAccess(patient, actor);
    await this.prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLog.log('PATIENT_DELETED', { userId: actor.sub, metadata: { patientId: id } });
  }
}
