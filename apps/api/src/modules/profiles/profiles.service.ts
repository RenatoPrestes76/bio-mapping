import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { STORAGE_PROVIDER } from '../../common/storage/storage.provider';
import type { StorageProvider } from '../../common/storage/storage.provider';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto, toProfileResponse } from './dto/profile-response.dto';
import { Gender } from '@bio/database';

const AVATAR_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async create(userId: string, dto: CreateProfileDto): Promise<ProfileResponseDto> {
    const existing = await this.prisma.profile.findFirst({ where: { userId, deletedAt: null } });
    if (existing) throw new ConflictException('Perfil já existe para este usuário');

    const profile = await this.prisma.profile.create({
      data: {
        userId,
        fullName: dto.fullName,
        cpf: dto.cpf,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender as Gender | undefined,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country ?? 'BR',
        zipcode: dto.zipcode,
        timezone: dto.timezone ?? 'America/Sao_Paulo',
        language: dto.language ?? 'pt-BR',
      },
    });

    await this.auditLog.log('PROFILE_CREATED', { userId, metadata: { profileId: profile.id } });
    return toProfileResponse(profile);
  }

  async getMyProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.prisma.profile.findFirst({ where: { userId, deletedAt: null } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    return toProfileResponse(profile);
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const profile = await this.prisma.profile.findFirst({ where: { userId, deletedAt: null } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const updated = await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        fullName: dto.fullName,
        cpf: dto.cpf,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender as Gender | undefined,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        zipcode: dto.zipcode,
        timezone: dto.timezone,
        language: dto.language,
      },
    });

    await this.auditLog.log('PROFILE_UPDATED', { userId, metadata: { profileId: profile.id } });
    return toProfileResponse(updated);
  }

  async delete(userId: string): Promise<void> {
    const profile = await this.prisma.profile.findFirst({ where: { userId, deletedAt: null } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    await this.prisma.profile.update({ where: { id: profile.id }, data: { deletedAt: new Date() } });
    await this.auditLog.log('PROFILE_DELETED', { userId, metadata: { profileId: profile.id } });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<ProfileResponseDto> {
    const profile = await this.prisma.profile.findFirst({ where: { userId, deletedAt: null } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    if (profile.photo) {
      await this.storage.delete(profile.photo).catch(() => {});
    }

    const url = await this.storage.upload(file, 'avatars');
    const updated = await this.prisma.profile.update({ where: { id: profile.id }, data: { photo: url } });
    await this.auditLog.log('PROFILE_AVATAR_UPDATED', { userId, metadata: { profileId: profile.id, url } });
    return toProfileResponse(updated);
  }

  /** Achado da Sprint 06: o `photo` gravado era o path estático
   * `/uploads/avatars/...`, que desde a Sprint 03 não é mais servido por
   * ninguém (o `useStaticAssets` foi removido por ser uma exposição pública
   * sem autenticação) — o avatar era salvo com sucesso mas o link retornado
   * ao cliente nunca funcionava. Esta rota (`GET /profiles/:userId/avatar`)
   * é o substituto autenticado: qualquer usuário autenticado pode ver o
   * avatar de qualquer outro (é a foto de perfil da rede, não dado clínico —
   * mesmo nível de exposição de `searchUsers`/convites do BioCircle, que já
   * mostram uma prévia mínima do usuário antes da conexão ser aceita), mas
   * nunca sem token nenhum. */
  async getAvatar(userId: string): Promise<{ path: string; mimeType: string }> {
    const profile = await this.prisma.profile.findFirst({ where: { userId, deletedAt: null } });
    if (!profile?.photo) throw new NotFoundException('Avatar não encontrado');

    const ext = extname(profile.photo).toLowerCase();
    return {
      path: this.storage.getAbsolutePath(profile.photo),
      mimeType: AVATAR_MIME_TYPES[ext] ?? 'application/octet-stream',
    };
  }
}
