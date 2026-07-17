import { Injectable } from '@nestjs/common';
import { ProgramCategory, ProgramStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class CareProgramRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    category: ProgramCategory;
    durationDays?: number;
    objectives?: string[];
    completionCriteria?: string;
    organizationId?: string;
    createdBy: string;
    isTemplate?: boolean;
  }) {
    return this.prisma.careProgram.create({ data, include: { phases: true } });
  }

  async findAll(filters: { category?: ProgramCategory; status?: ProgramStatus; organizationId?: string } = {}) {
    return this.prisma.careProgram.findMany({
      where: { ...filters, deletedAt: null },
      include: { phases: { orderBy: { order: 'asc' } }, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.careProgram.findFirst({
      where: { id, deletedAt: null },
      include: {
        phases: { orderBy: { order: 'asc' } },
        taskTemplates: { where: { isTemplate: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    status: ProgramStatus;
    durationDays: number;
    objectives: string[];
    completionCriteria: string;
  }>) {
    return this.prisma.careProgram.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.careProgram.update({ where: { id }, data: { deletedAt: new Date(), status: ProgramStatus.ARCHIVED } });
  }

  async addPhase(programId: string, data: { name: string; description?: string; order: number; durationDays?: number; objectives?: string[] }) {
    return this.prisma.programPhase.create({ data: { programId, ...data } });
  }
}
