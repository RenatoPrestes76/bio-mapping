import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { BioConnection, BioCircleNotification, UserPrivacySettings } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditLogService } from '../../../common/audit/audit-log.service.js';
import { BioCircleRepository } from '../repositories/biocircle.repository.js';
import { BioCircleNotificationService } from '../notifications/biocircle-notification.service.js';
import { canDiscover, canSendInvite } from '../policies/biocircle.policy.js';
import type { SendInviteDto } from '../dto/send-invite.dto.js';
import type { UpdatePrivacyDto } from '../dto/update-privacy.dto.js';

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

export interface DashboardStats {
  acceptedCount: number;
  pendingReceived: number;
  pendingSent: number;
  unreadNotifications: number;
}

@Injectable()
export class BioCircleService {
  constructor(
    private readonly repository: BioCircleRepository,
    private readonly notificationService: BioCircleNotificationService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async sendInvite(requesterId: string, dto: SendInviteDto): Promise<BioConnection> {
    if (requesterId === dto.receiverId) {
      throw new ConflictException('Cannot connect with yourself');
    }

    // Check both directions for an existing connection
    const [forward, reverse] = await Promise.all([
      this.repository.findByPair(requesterId, dto.receiverId),
      this.repository.findByPair(dto.receiverId, requesterId),
    ]);

    if (reverse) {
      if (reverse.status === 'PENDING') throw new ConflictException('User already sent you a connection request');
      if (reverse.status === 'ACCEPTED') throw new ConflictException('Already connected');
      if (reverse.status === 'BLOCKED') throw new ForbiddenException('Cannot send connection request');
    }

    if (forward) {
      if (forward.status === 'PENDING') throw new ConflictException('Invite already sent');
      if (forward.status === 'ACCEPTED') throw new ConflictException('Already connected');
      if (forward.status === 'BLOCKED') throw new ForbiddenException('Cannot send connection request');
      // REJECTED or REMOVED: re-invite by resetting
      const updated = await this.repository.updateStatus(forward.id, 'PENDING');
      await this.notificationService.create(dto.receiverId, 'CONNECTION_REQUEST', updated.id, 'bio_connections');
      await this.audit.log('CONNECTION_REQUESTED', { userId: requesterId, metadata: { receiverId: dto.receiverId } });
      return updated;
    }

    // Check receiver's privacy settings
    const receiverSettings = await this.repository.findPrivacySettings(dto.receiverId);
    const isConnected = false;
    if (!canSendInvite(receiverSettings as never, false, isConnected)) {
      throw new ForbiddenException('This user does not accept connection requests');
    }

    const connection = await this.repository.createConnection({
      requesterId,
      receiverId: dto.receiverId,
      relationshipType: dto.relationshipType,
    });

    await this.notificationService.create(dto.receiverId, 'CONNECTION_REQUEST', connection.id, 'bio_connections');
    await this.audit.log('CONNECTION_REQUESTED', { userId: requesterId, metadata: { receiverId: dto.receiverId } });

    return connection;
  }

  async accept(connectionId: string, userId: string): Promise<BioConnection> {
    const connection = await this.findConnectionForUser(connectionId, userId, 'receiver');
    if (connection.status !== 'PENDING') {
      throw new ConflictException(`Connection is already ${connection.status.toLowerCase()}`);
    }

    const accepted = await this.repository.updateStatus(connectionId, 'ACCEPTED', { acceptedAt: new Date() });
    await this.notificationService.create(connection.requesterId, 'CONNECTION_ACCEPTED', connectionId, 'bio_connections');
    await this.audit.log('CONNECTION_ACCEPTED', { userId, metadata: { connectionId } });

    return accepted;
  }

  async reject(connectionId: string, userId: string): Promise<BioConnection> {
    const connection = await this.findConnectionForUser(connectionId, userId, 'receiver');
    if (connection.status !== 'PENDING') {
      throw new ConflictException(`Connection is already ${connection.status.toLowerCase()}`);
    }

    const rejected = await this.repository.updateStatus(connectionId, 'REJECTED');
    await this.audit.log('CONNECTION_REJECTED', { userId, metadata: { connectionId } });

    return rejected;
  }

  async block(connectionId: string, userId: string): Promise<BioConnection> {
    const connection = await this.findConnectionForUser(connectionId, userId, 'both');
    const blocked = await this.repository.updateStatus(connectionId, 'BLOCKED');
    await this.audit.log('CONNECTION_BLOCKED', { userId, metadata: { connectionId } });
    return blocked;
  }

  async remove(connectionId: string, userId: string): Promise<BioConnection> {
    const connection = await this.findConnectionForUser(connectionId, userId, 'both');
    if (connection.status !== 'ACCEPTED') {
      throw new ConflictException('Can only remove accepted connections');
    }
    const removed = await this.repository.updateStatus(connectionId, 'REMOVED');
    await this.audit.log('CONNECTION_REMOVED', { userId, metadata: { connectionId } });
    return removed;
  }

  async findConnections(userId: string): Promise<BioConnection[]> {
    return this.repository.findAccepted(userId);
  }

  async findReceivedInvites(userId: string): Promise<BioConnection[]> {
    return this.repository.findByReceiver(userId, 'PENDING');
  }

  async findSentInvites(userId: string): Promise<BioConnection[]> {
    return this.repository.findByRequester(userId, 'PENDING');
  }

  async searchUsers(query: string, requesterId: string): Promise<UserSearchResult[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        NOT: { id: requesterId },
      },
      select: { id: true, name: true, email: true },
      take: 20,
    });

    // Apply privacy filter
    const settled = await Promise.allSettled(
      users.map(async (user) => {
        const settings = await this.repository.findPrivacySettings(user.id);
        const [accepted] = await Promise.all([
          this.repository.findByPair(requesterId, user.id),
        ]);
        const isConnected = !!accepted && accepted.status === 'ACCEPTED';
        if (!canDiscover(settings as never, false, isConnected)) return null;
        return user;
      }),
    );

    return settled
      .filter((r): r is PromiseFulfilledResult<UserSearchResult> => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value);
  }

  async getPrivacySettings(userId: string): Promise<UserPrivacySettings | null> {
    return this.repository.findPrivacySettings(userId);
  }

  async updatePrivacySettings(userId: string, dto: UpdatePrivacyDto): Promise<UserPrivacySettings> {
    const settings = await this.repository.upsertPrivacySettings(userId, dto as never);
    await this.audit.log('PRIVACY_UPDATED', { userId, metadata: { fields: Object.keys(dto) } });
    return settings;
  }

  async getNotifications(userId: string): Promise<BioCircleNotification[]> {
    return this.notificationService.findByUser(userId);
  }

  async markNotificationRead(id: string): Promise<BioCircleNotification> {
    return this.notificationService.markRead(id);
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    return this.notificationService.markAllRead(userId);
  }

  async getDashboard(userId: string): Promise<DashboardStats> {
    const [accepted, received, sent, unread] = await Promise.all([
      this.repository.findAccepted(userId),
      this.repository.findByReceiver(userId, 'PENDING'),
      this.repository.findByRequester(userId, 'PENDING'),
      this.notificationService.countUnread(userId),
    ]);
    return {
      acceptedCount: accepted.length,
      pendingReceived: received.length,
      pendingSent: sent.length,
      unreadNotifications: unread,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async findConnectionForUser(
    connectionId: string,
    userId: string,
    role: 'receiver' | 'requester' | 'both',
  ): Promise<BioConnection> {
    const connection = await this.repository.findById(connectionId);
    if (!connection) throw new NotFoundException(`Connection ${connectionId} not found`);

    const isReceiver = connection.receiverId === userId;
    const isRequester = connection.requesterId === userId;

    if (role === 'receiver' && !isReceiver) throw new ForbiddenException('Not authorised');
    if (role === 'requester' && !isRequester) throw new ForbiddenException('Not authorised');
    if (role === 'both' && !isReceiver && !isRequester) throw new ForbiddenException('Not authorised');

    return connection;
  }
}
