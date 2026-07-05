import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { BloodType } from '@bio/database';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { PatientResponseDto, toPatientResponse } from './dto/patient-response.dto';
import { paginated, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  private generateRegistrationCode(): string {
    return 'PAT-' + randomBytes(4).toString('hex').toUpperCase();
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

  async findAll(dto: SearchPatientsDto): Promise<PaginatedResponse<PatientResponseDto>> {
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

  async findById(id: string): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return toPatientResponse(patient);
  }

  async update(id: string, dto: UpdatePatientDto, actorId: string): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findFirst({ where: { id, deletedAt: null } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

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

    await this.auditLog.log('PATIENT_UPDATED', { userId: actorId, metadata: { patientId: id } });
    return toPatientResponse(updated);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const patient = await this.prisma.patient.findFirst({ where: { id, deletedAt: null } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    await this.prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLog.log('PATIENT_DELETED', { userId: actorId, metadata: { patientId: id } });
  }
}
