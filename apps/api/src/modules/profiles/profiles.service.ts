import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { STORAGE_PROVIDER } from '../../common/storage/storage.provider';
import type { StorageProvider } from '../../common/storage/storage.provider';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto, toProfileResponse } from './dto/profile-response.dto';
import { Gender } from '@bio/database';

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
}
