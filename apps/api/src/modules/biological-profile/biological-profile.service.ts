import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateBiologicalProfileDto } from './dto/update-biological-profile.dto';
import { BiologicalProfileResponseDto } from './dto/biological-profile-response.dto';

@Injectable()
export class BiologicalProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: string): Promise<BiologicalProfileResponseDto> {
    const profile = await this.prisma.biologicalProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Perfil biológico ainda não criado');
    }

    return profile;
  }

  async upsertMine(
    userId: string,
    dto: UpdateBiologicalProfileDto,
  ): Promise<BiologicalProfileResponseDto> {
    return this.prisma.biologicalProfile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }
}
