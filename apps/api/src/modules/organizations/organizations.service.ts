import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, OrganizationPlan, OrganizationStatus } from '@bio/database';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationResponseDto, toOrganizationResponse } from './dto/organization-response.dto';
import { paginated, PaginatedResponse, PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    const org = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          document: dto.document,
          plan: dto.plan as OrganizationPlan ?? 'FREE',
        },
      });
      await tx.membership.create({
        data: { organizationId: organization.id, userId, role: 'OWNER' as MembershipRole },
      });
      return organization;
    });

    await this.auditLog.log('ORG_CREATED', { userId, metadata: { orgId: org.id } });
    return toOrganizationResponse(org);
  }

  async findMyOrganizations(userId: string, dto: PaginationDto): Promise<PaginatedResponse<OrganizationResponseDto>> {
    const { page = 1, limit = 20 } = dto;
    const where = {
      deletedAt: null,
      memberships: { some: { userId, deletedAt: null } },
    };
    const [orgs, total] = await Promise.all([
      this.prisma.organization.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.organization.count({ where }),
    ]);
    return paginated(orgs.map(toOrganizationResponse), total, page, limit);
  }

  async findById(id: string): Promise<OrganizationResponseDto> {
    const org = await this.prisma.organization.findFirst({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException('Organização não encontrada');
    return toOrganizationResponse(org);
  }

  async update(id: string, userId: string, dto: UpdateOrganizationDto): Promise<OrganizationResponseDto> {
    await this.assertOrgAdmin(id, userId);
    const org = await this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name,
        document: dto.document,
        plan: dto.plan as OrganizationPlan | undefined,
        status: dto.status as OrganizationStatus | undefined,
      },
    });
    await this.auditLog.log('ORG_UPDATED', { userId, metadata: { orgId: id } });
    return toOrganizationResponse(org);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.assertOrgOwner(id, userId);
    await this.prisma.organization.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLog.log('ORG_DELETED', { userId, metadata: { orgId: id } });
  }

  async assertOrgAdmin(organizationId: string, userId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId, role: { in: ['OWNER', 'ADMIN'] }, deletedAt: null },
    });
    if (!membership) throw new ForbiddenException('Permissão insuficiente na organização');
  }

  async assertOrgOwner(organizationId: string, userId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId, role: 'OWNER', deletedAt: null },
    });
    if (!membership) throw new ForbiddenException('Apenas o OWNER pode realizar esta ação');
  }
}
