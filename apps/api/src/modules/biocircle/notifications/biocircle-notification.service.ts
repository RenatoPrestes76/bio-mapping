import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { BioCircleNotification, BioCircleNotificationType } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class BioCircleNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    type: BioCircleNotificationType,
    referenceId?: string,
    referenceType?: string,
  ): Promise<BioCircleNotification> {
    return this.prisma.bioCircleNotification.create({
      data: { userId, type, referenceId, referenceType },
    });
  }

  async findByUser(userId: string): Promise<BioCircleNotification[]> {
    return this.prisma.bioCircleNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.bioCircleNotification.count({
      where: { userId, read: false },
    });
  }

  /** Achado da Sprint 03: atualizava por `id` sem checar dono — qualquer
   * usuário autenticado podia marcar como lida (e assim silenciar) a
   * notificação de QUALQUER outro usuário. */
  async markRead(id: string, actorUserId: string): Promise<BioCircleNotification> {
    const notification = await this.prisma.bioCircleNotification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notificação não encontrada');
    if (notification.userId !== actorUserId) throw new ForbiddenException('Acesso negado');

    return this.prisma.bioCircleNotification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.bioCircleNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
