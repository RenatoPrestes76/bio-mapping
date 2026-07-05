import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@bio/database';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipResponseDto, toMembershipResponse } from './dto/membership-response.dto';
import { paginated, PaginatedResponse, PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async listMembers(organizationId: string, dto: PaginationDto): Promise<PaginatedResponse<MembershipResponseDto>> {
    const { page = 1, limit = 20 } = dto;
    const where = { organizationId, deletedAt: null };
    const [members, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.membership.count({ where }),
    ]);
    return paginated(members.map(toMembershipResponse), total, page, limit);
  }

  async updateRole(organizationId: string, targetUserId: string, actorId: string, dto: UpdateMembershipDto): Promise<MembershipResponseDto> {
    await this.organizationsService.assertOrgAdmin(organizationId, actorId);

    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId: targetUserId, deletedAt: null },
    });
    if (!membership) throw new NotFoundException('Membro não encontrado na organização');

    if (membership.role === 'OWNER') throw new ForbiddenException('Não é possível alterar o cargo do OWNER');

    const updated = await this.prisma.membership.update({
      where: { id: membership.id },
      data: { role: dto.role as MembershipRole },
    });

    await this.auditLog.log('MEMBERSHIP_UPDATED', {
      userId: actorId,
      metadata: { organizationId, targetUserId, newRole: dto.role },
    });

    return toMembershipResponse(updated);
  }

  async removeMember(organizationId: string, targetUserId: string, actorId: string): Promise<void> {
    await this.organizationsService.assertOrgAdmin(organizationId, actorId);

    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId: targetUserId, deletedAt: null },
    });
    if (!membership) throw new NotFoundException('Membro não encontrado na organização');
    if (membership.role === 'OWNER') throw new ForbiddenException('Não é possível remover o OWNER');

    await this.prisma.membership.update({ where: { id: membership.id }, data: { deletedAt: new Date() } });
    await this.auditLog.log('MEMBERSHIP_DELETED', {
      userId: actorId,
      metadata: { organizationId, targetUserId },
    });
  }
}
