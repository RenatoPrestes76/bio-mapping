import { Injectable } from '@nestjs/common';
import { HealthPlatform, HealthSourceStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class HealthSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    patientId: string;
    platform: HealthPlatform;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    scopes: string[];
    externalUserId?: string;
    status?: HealthSourceStatus;
  }) {
    return this.prisma.healthSource.create({ data });
  }

  async upsert(patientId: string, platform: HealthPlatform, data: Partial<{
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    scopes: string[];
    externalUserId: string;
    status: HealthSourceStatus;
    lastSyncAt: Date;
  }>) {
    return this.prisma.healthSource.upsert({
      where: { patientId_platform: { patientId, platform } },
      create: { patientId, platform, scopes: [], status: HealthSourceStatus.PENDING, ...data },
      update: data,
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.healthSource.findMany({
      where: { patientId },
      orderBy: { platform: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.healthSource.findUnique({ where: { id } });
  }

  async findByPatientAndPlatform(patientId: string, platform: HealthPlatform) {
    return this.prisma.healthSource.findUnique({
      where: { patientId_platform: { patientId, platform } },
    });
  }

  async updateStatus(id: string, status: HealthSourceStatus) {
    return this.prisma.healthSource.update({ where: { id }, data: { status } });
  }

  async updateLastSync(id: string) {
    return this.prisma.healthSource.update({ where: { id }, data: { lastSyncAt: new Date() } });
  }

  async updateTokens(id: string, tokens: {
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  }) {
    return this.prisma.healthSource.update({ where: { id }, data: tokens });
  }
}
