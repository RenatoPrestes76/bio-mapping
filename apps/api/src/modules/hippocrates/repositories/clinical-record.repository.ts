import { Injectable } from '@nestjs/common';
import { ClinicalRecordType, ClinicalStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class ClinicalRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    patientId: string;
    organizationId?: string;
    recordType: ClinicalRecordType;
    code?: string;
    codeSystem?: string;
    displayName?: string;
    sourceSystem?: string;
    sourceId?: string;
    effectiveDate?: Date;
    payload: Record<string, unknown>;
    checksum?: string;
    importedVia?: string;
  }) {
    return this.prisma.clinicalRecord.create({ data: data as Parameters<typeof this.prisma.clinicalRecord.create>[0]['data'] });
  }

  async findByPatient(patientId: string, filters: { recordType?: ClinicalRecordType; status?: ClinicalStatus } = {}) {
    return this.prisma.clinicalRecord.findMany({
      where: { patientId, deletedAt: null, ...filters },
      include: { observations: true, externalIds: true },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.clinicalRecord.findFirst({
      where: { id, deletedAt: null },
      include: { observations: true, externalIds: true },
    });
  }

  async findByExternalId(system: string, value: string) {
    const extId = await this.prisma.externalIdentifier.findFirst({
      where: { system, value },
      include: { record: { include: { observations: true, externalIds: true } } },
    });
    return extId?.record ?? null;
  }

  async update(id: string, data: Partial<{ status: ClinicalStatus; payload: object; checksum: string; version: number }>) {
    return this.prisma.clinicalRecord.update({ where: { id }, data });
  }

  async addObservation(data: {
    clinicalRecordId: string;
    patientId: string;
    code?: string;
    codeSystem?: string;
    displayName?: string;
    value?: string;
    numericValue?: number;
    unit?: string;
    referenceRange?: string;
    interpretation?: string;
    effectiveDate?: Date;
  }) {
    return this.prisma.clinicalObservation.create({ data });
  }

  async addExternalId(clinicalRecordId: string, system: string, value: string, use?: string) {
    return this.prisma.externalIdentifier.upsert({
      where: { system_value: { system, value } },
      create: { clinicalRecordId, system, value, use },
      update: { clinicalRecordId },
    });
  }

  async countByPatient(patientId: string): Promise<number> {
    return this.prisma.clinicalRecord.count({ where: { patientId, deletedAt: null } });
  }
}
