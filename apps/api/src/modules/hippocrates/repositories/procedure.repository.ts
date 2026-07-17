import { Injectable } from '@nestjs/common';
import { ClinicalStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class ProcedureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertBySource(patientId: string, sourceSystem: string, sourceId: string, data: {
    name: string;
    code?: string;
    codeSystem?: string;
    performedDate?: Date;
    performedBy?: string;
    location?: string;
    outcome?: string;
    notes?: string;
    organizationId?: string;
  }) {
    const existing = await this.prisma.procedure.findFirst({
      where: { patientId, sourceSystem, sourceId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.procedure.update({ where: { id: existing.id }, data });
    }
    return this.prisma.procedure.create({ data: { patientId, sourceSystem, sourceId, ...data } });
  }

  async create(data: { patientId: string; name: string; [key: string]: unknown }) {
    return this.prisma.procedure.create({ data: data as Parameters<typeof this.prisma.procedure.create>[0]['data'] });
  }

  async findByPatient(patientId: string, status?: ClinicalStatus) {
    return this.prisma.procedure.findMany({
      where: { patientId, deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { performedDate: 'desc' },
    });
  }
}
