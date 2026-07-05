import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Specialty } from '@bio/database';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { SearchProfessionalsDto } from './dto/search-professionals.dto';
import { ProfessionalResponseDto, toProfessionalResponse } from './dto/professional-response.dto';
import { paginated, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(userId: string, dto: CreateProfessionalDto): Promise<ProfessionalResponseDto> {
    const existing = await this.prisma.professional.findFirst({ where: { userId, deletedAt: null } });
    if (existing) throw new ConflictException('Registro profissional já existe para este usuário');

    const professional = await this.prisma.professional.create({
      data: {
        userId,
        specialty: dto.specialty as Specialty,
        licenseNumber: dto.licenseNumber,
        licenseState: dto.licenseState,
        institution: dto.institution,
        bio: dto.bio,
      },
    });

    await this.auditLog.log('PROFESSIONAL_CREATED', { userId, metadata: { professionalId: professional.id } });
    return toProfessionalResponse(professional);
  }

  async findAll(dto: SearchProfessionalsDto): Promise<PaginatedResponse<ProfessionalResponseDto>> {
    const { page = 1, limit = 20, name, specialty, organizationId } = dto;
    const where: any = { deletedAt: null };
    if (specialty) where.specialty = specialty;
    if (name) where.user = { name: { contains: name, mode: 'insensitive' }, deletedAt: null };
    if (organizationId) {
      where.user = { ...where.user, memberships: { some: { organizationId, deletedAt: null } } };
    }

    const [professionals, total] = await Promise.all([
      this.prisma.professional.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.professional.count({ where }),
    ]);

    return paginated(professionals.map(toProfessionalResponse), total, page, limit);
  }

  async findById(id: string): Promise<ProfessionalResponseDto> {
    const professional = await this.prisma.professional.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!professional) throw new NotFoundException('Profissional não encontrado');
    return toProfessionalResponse(professional);
  }

  async updateMine(userId: string, dto: UpdateProfessionalDto): Promise<ProfessionalResponseDto> {
    const professional = await this.prisma.professional.findFirst({ where: { userId, deletedAt: null } });
    if (!professional) throw new NotFoundException('Registro profissional não encontrado');

    const updated = await this.prisma.professional.update({
      where: { id: professional.id },
      data: {
        specialty: dto.specialty as Specialty | undefined,
        licenseNumber: dto.licenseNumber,
        licenseState: dto.licenseState,
        institution: dto.institution,
        bio: dto.bio,
      },
    });

    await this.auditLog.log('PROFESSIONAL_UPDATED', { userId, metadata: { professionalId: professional.id } });
    return toProfessionalResponse(updated);
  }

  async deleteMine(userId: string): Promise<void> {
    const professional = await this.prisma.professional.findFirst({ where: { userId, deletedAt: null } });
    if (!professional) throw new NotFoundException('Registro profissional não encontrado');
    await this.prisma.professional.update({ where: { id: professional.id }, data: { deletedAt: new Date() } });
    await this.auditLog.log('PROFESSIONAL_DELETED', { userId, metadata: { professionalId: professional.id } });
  }
}
