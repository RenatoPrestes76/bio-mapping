import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipRole } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { ORG_ROLES_KEY } from '../decorators/require-org-role.decorator.js';

@Injectable()
export class OrgRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<MembershipRole[]>(ORG_ROLES_KEY, context.getHandler());
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: { sub: string }; params: Record<string, string>; query: Record<string, string> }>();
    const user = request.user;
    if (!user?.sub) throw new UnauthorizedException();

    const organizationId = request.params['organizationId'] ?? request.query['organizationId'];
    if (!organizationId) throw new ForbiddenException('organizationId é obrigatório');

    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId: user.sub, role: { in: requiredRoles }, deletedAt: null },
    });

    if (!membership) throw new ForbiddenException('Permissão insuficiente nesta organização');
    return true;
  }
}
