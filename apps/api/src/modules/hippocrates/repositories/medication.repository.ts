import { Injectable } from '@nestjs/common';
import { ClinicalStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class MedicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertBySource(patientId: string, sourceSystem: string, sourceId: string, data: {
    name: string;
    code?: string;
    codeSystem?: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    startDate?: Date;
    endDate?: Date;
    prescribedBy?: string;
    notes?: string;
    organizationId?: string;
  }) {
    const existing = await this.prisma.medication.findFirst({
      where: { patientId, sourceSystem, sourceId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.medication.update({ where: { id: existing.id }, data });
    }
    return this.prisma.medication.create({ data: { patientId, sourceSystem, sourceId, ...data } });
  }

  async create(data: { patientId: string; name: string; [key: string]: unknown }) {
    return this.prisma.medication.create({ data: data as Parameters<typeof this.prisma.medication.create>[0]['data'] });
  }

  async findByPatient(patientId: string, status?: ClinicalStatus) {
    return this.prisma.medication.findMany({
      where: { patientId, deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { startDate: 'desc' },
    });
  }
}
