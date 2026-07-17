import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class BranchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    name: string;
    address?: string;
    phone?: string;
    city?: string;
    state?: string;
  }) {
    return this.prisma.branch.create({ data });
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId, deletedAt: null },
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { memberships: true } } },
    });
  }

  async update(id: string, data: Partial<{ name: string; address: string; phone: string; city: string; state: string; isActive: boolean }>) {
    return this.prisma.branch.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.branch.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.prisma.branch.count({ where: { organizationId, deletedAt: null } });
  }
}
