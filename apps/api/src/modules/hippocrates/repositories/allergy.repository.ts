import { Injectable } from '@nestjs/common';
import { ClinicalStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class AllergyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertBySource(patientId: string, sourceSystem: string, sourceId: string, data: {
    allergen: string;
    code?: string;
    codeSystem?: string;
    reaction?: string;
    severity?: string;
    onsetDate?: Date;
    notes?: string;
  }) {
    const existing = await this.prisma.allergy.findFirst({
      where: { patientId, sourceSystem, sourceId, deletedAt: null },
    });
    if (existing) {
      return this.prisma.allergy.update({ where: { id: existing.id }, data });
    }
    return this.prisma.allergy.create({ data: { patientId, sourceSystem, sourceId, ...data } });
  }

  async create(data: { patientId: string; allergen: string; [key: string]: unknown }) {
    return this.prisma.allergy.create({ data: data as Parameters<typeof this.prisma.allergy.create>[0]['data'] });
  }

  async findByPatient(patientId: string, status?: ClinicalStatus) {
    return this.prisma.allergy.findMany({
      where: { patientId, deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
}
