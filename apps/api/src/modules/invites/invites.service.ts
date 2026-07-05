import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { MembershipRole } from '@bio/database';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto, toInviteResponse } from './dto/invite-response.dto';

const INVITE_TTL_DAYS = 7;

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async send(organizationId: string, actorId: string, dto: CreateInviteDto): Promise<InviteResponseDto> {
    await this.organizationsService.assertOrgAdmin(organizationId, actorId);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.invite.create({
      data: {
        organizationId,
        invitedBy: actorId,
        email: dto.email,
        role: dto.role as MembershipRole,
        token,
        expiresAt,
      },
    });

    await this.auditLog.log('INVITE_SENT', {
      userId: actorId,
      metadata: { organizationId, email: dto.email, role: dto.role },
    });

    return toInviteResponse(invite);
  }

  async listMyInvites(userEmail: string): Promise<InviteResponseDto[]> {
    const invites = await this.prisma.invite.findMany({
      where: { email: userEmail, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return invites.map(toInviteResponse);
  }

  async accept(token: string, userId: string, userEmail: string): Promise<void> {
    const invite = await this.prisma.invite.findUnique({ where: { token } });

    if (!invite || invite.status !== 'PENDING') throw new NotFoundException('Convite não encontrado ou já utilizado');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Convite expirado');
    if (invite.email !== userEmail) throw new BadRequestException('Este convite não pertence ao seu e-mail');

    const existingMembership = await this.prisma.membership.findFirst({
      where: { organizationId: invite.organizationId, userId, deletedAt: null },
    });
    if (existingMembership) throw new ConflictException('Você já é membro desta organização');

    await this.prisma.$transaction([
      this.prisma.invite.update({ where: { token }, data: { status: 'ACCEPTED', acceptedAt: new Date() } }),
      this.prisma.membership.create({
        data: { organizationId: invite.organizationId, userId, role: invite.role },
      }),
    ]);

    await this.auditLog.log('INVITE_ACCEPTED', {
      userId,
      metadata: { organizationId: invite.organizationId, inviteId: invite.id },
    });
  }

  async reject(token: string, userId: string, userEmail: string): Promise<void> {
    const invite = await this.prisma.invite.findUnique({ where: { token } });

    if (!invite || invite.status !== 'PENDING') throw new NotFoundException('Convite não encontrado ou já utilizado');
    if (invite.email !== userEmail) throw new BadRequestException('Este convite não pertence ao seu e-mail');

    await this.prisma.invite.update({ where: { token }, data: { status: 'REJECTED', rejectedAt: new Date() } });

    await this.auditLog.log('INVITE_REJECTED', {
      userId,
      metadata: { organizationId: invite.organizationId, inviteId: invite.id },
    });
  }
}
