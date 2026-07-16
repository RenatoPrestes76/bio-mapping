import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class AlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(alerts: any[]) {
    if (alerts.length === 0) return [];
    return this.prisma.$transaction(
      alerts.map((a) => this.prisma.alert.create({ data: a })),
    );
  }

  async findAll(
    patientId: string,
    opts: { unreadOnly?: boolean; unresolvedOnly?: boolean } = {},
  ) {
    return this.prisma.alert.findMany({
      where: {
        patientId,
        ...(opts.unreadOnly ? { isRead: false } : {}),
        ...(opts.unresolvedOnly ? { isResolved: false } : {}),
      },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
    });
  }

  async findById(id: string) {
    return this.prisma.alert.findUnique({ where: { id } });
  }

  async markRead(id: string) {
    return this.prisma.alert.update({ where: { id }, data: { isRead: true } });
  }

  async resolve(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { isResolved: true, resolvedAt: new Date() },
    });
  }

  async findUnresolvedTypes(patientId: string, types: string[]) {
    return this.prisma.alert.findMany({
      where: { patientId, type: { in: types as any }, isResolved: false },
    });
  }
}
