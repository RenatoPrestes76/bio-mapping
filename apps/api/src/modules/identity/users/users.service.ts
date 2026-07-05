import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Gender, Role, UserStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../common/audit/audit-log.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { toUserResponse, UserResponseDto } from './dto/user-response.dto';
import { paginated, PaginatedResponse } from '../../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return toUserResponse(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender as Gender | undefined,
      },
    });
    return toUserResponse(user);
  }

  async findAll(dto: SearchUsersDto): Promise<PaginatedResponse<UserResponseDto>> {
    const { page = 1, limit = 20, name, email, status, role } = dto;
    const where = {
      deletedAt: null,
      ...(name && { name: { contains: name, mode: 'insensitive' as const } }),
      ...(email && { email: { contains: email, mode: 'insensitive' as const } }),
      ...(status && { status: status as UserStatus }),
      ...(role && { role: role as Role }),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(users.map(toUserResponse), total, page, limit);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return toUserResponse(user);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, actorId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === 'ADMIN' && id !== actorId) {
      throw new ForbiddenException('Não é possível alterar o status de outro administrador');
    }
    const updated = await this.prisma.user.update({ where: { id }, data: { status: dto.status } });
    await this.auditLog.log('USER_STATUS_CHANGED', {
      userId: actorId,
      metadata: { targetUserId: id, status: dto.status },
    });
    return toUserResponse(updated);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (id === actorId) throw new ForbiddenException('Não é possível excluir sua própria conta por este endpoint');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLog.log('USER_DELETED', { userId: actorId, metadata: { targetUserId: id } });
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ip?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual');
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditLog.log('USER_PASSWORD_CHANGED', { userId, ip });
  }
}
