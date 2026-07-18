import { Injectable } from '@nestjs/common';
import type { BioConnection, ConnectionStatus, ConnectionRelationshipType, UserPrivacySettings } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

export interface CreateConnectionData {
  requesterId: string;
  receiverId: string;
  relationshipType: ConnectionRelationshipType;
  tenantId?: string;
}

@Injectable()
export class BioCircleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createConnection(data: CreateConnectionData): Promise<BioConnection> {
    return this.prisma.bioConnection.create({ data });
  }

  async findByPair(requesterId: string, receiverId: string): Promise<BioConnection | null> {
    return this.prisma.bioConnection.findUnique({
      where: { requesterId_receiverId: { requesterId, receiverId } },
    });
  }

  async findByRequester(requesterId: string, status?: ConnectionStatus): Promise<BioConnection[]> {
    return this.prisma.bioConnection.findMany({
      where: { requesterId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByReceiver(receiverId: string, status?: ConnectionStatus): Promise<BioConnection[]> {
    return this.prisma.bioConnection.findMany({
      where: { receiverId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAccepted(userId: string): Promise<BioConnection[]> {
    return this.prisma.bioConnection.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  async findById(id: string): Promise<BioConnection | null> {
    return this.prisma.bioConnection.findUnique({ where: { id } });
  }

  async updateStatus(
    id: string,
    status: ConnectionStatus,
    extra?: Partial<{ acceptedAt: Date }>,
  ): Promise<BioConnection> {
    return this.prisma.bioConnection.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  async updateByPair(requesterId: string, receiverId: string, status: ConnectionStatus): Promise<BioConnection> {
    return this.prisma.bioConnection.update({
      where: { requesterId_receiverId: { requesterId, receiverId } },
      data: { status },
    });
  }

  // ── Privacy settings ────────────────────────────────────────────────────────

  async findPrivacySettings(userId: string): Promise<UserPrivacySettings | null> {
    return this.prisma.userPrivacySettings.findUnique({ where: { userId } });
  }

  async upsertPrivacySettings(
    userId: string,
    data: Partial<Omit<UserPrivacySettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<UserPrivacySettings> {
    return this.prisma.userPrivacySettings.upsert({
      where: { userId },
      create: { userId, ...data } as never,
      update: data as never,
    });
  }
}
