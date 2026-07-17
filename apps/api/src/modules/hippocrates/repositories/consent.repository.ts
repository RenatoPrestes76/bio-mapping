import { Injectable } from '@nestjs/common';
import { ConsentStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class ConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    patientId: string;
    organizationId: string;
    grantedBy: string;
    scopes: string[];
    validUntil?: Date;
    ipAddress?: string;
  }) {
    return this.prisma.consent.create({ data });
  }

  async findByPatient(patientId: string, status?: ConsentStatus) {
    return this.prisma.consent.findMany({
      where: { patientId, ...(status ? { status } : {}) },
      include: { organization: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.consent.findUnique({ where: { id } });
  }

  async findActiveByPatientAndOrg(patientId: string, organizationId: string) {
    return this.prisma.consent.findFirst({
      where: {
        patientId,
        organizationId,
        status: ConsentStatus.ACTIVE,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
    });
  }

  async revoke(id: string, revokedBy: string, revokeReason?: string) {
    return this.prisma.consent.update({
      where: { id },
      data: { status: ConsentStatus.REVOKED, revokedAt: new Date(), revokedBy, revokeReason },
    });
  }

  async expireOverdue() {
    return this.prisma.consent.updateMany({
      where: { status: ConsentStatus.ACTIVE, validUntil: { lt: new Date() } },
      data: { status: ConsentStatus.EXPIRED },
    });
  }
}
