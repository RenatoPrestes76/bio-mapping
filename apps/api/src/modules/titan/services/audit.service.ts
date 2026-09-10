import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';

export interface AuditQueryDto {
  organizationId: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async query(dto: AuditQueryDto, actorId: string) {
    // organizationId é obrigatório — sem ele, a query anterior devolvia o audit log
    // de TODAS as organizações da plataforma para qualquer usuário autenticado.
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: dto.organizationId, userId: actorId, role: { in: ['OWNER', 'ADMIN'] }, deletedAt: null },
    });
    if (!membership) throw new ForbiddenException('Permissão insuficiente na organização');

    const { organizationId, userId, action, from, to, page = 1, limit = 50 } = dto;

    const where: Record<string, unknown> = { organizationId };
    if (userId) where['userId'] = userId;
    if (action) where['action'] = { contains: action, mode: 'insensitive' };
    if (from || to) {
      where['createdAt'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [events, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: where as NonNullable<Parameters<typeof this.prisma.auditLog.findMany>[0]>['where'],
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({
        where: where as NonNullable<Parameters<typeof this.prisma.auditLog.count>[0]>['where'],
      }),
    ]);

    return {
      data: events,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async logOrgEvent(action: string, context: {
    userId: string;
    organizationId: string;
    metadata?: Record<string, unknown>;
    ip?: string;
  }) {
    return this.auditLog.log(action as never, {
      userId: context.userId,
      metadata: { organizationId: context.organizationId, ...context.metadata },
      ip: context.ip,
    });
  }
}
