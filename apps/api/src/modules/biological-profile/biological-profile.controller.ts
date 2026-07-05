import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BiologicalProfileService } from './biological-profile.service';
import { UpdateBiologicalProfileDto } from './dto/update-biological-profile.dto';
import { BiologicalProfileResponseDto } from './dto/biological-profile-response.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface';

@ApiTags('biological-profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('biological-profile')
export class BiologicalProfileController {
  constructor(private readonly biologicalProfileService: BiologicalProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna o perfil biológico do usuário autenticado' })
  @ApiResponse({ status: 200, type: BiologicalProfileResponseDto })
  @ApiResponse({ status: 404, description: 'Perfil biológico ainda não criado' })
  getMine(@CurrentUser() user: JwtPayload): Promise<BiologicalProfileResponseDto> {
    return this.biologicalProfileService.getMine(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Cria ou atualiza (upsert) o perfil biológico do usuário autenticado' })
  @ApiResponse({ status: 200, type: BiologicalProfileResponseDto })
  upsertMine(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateBiologicalProfileDto,
  ): Promise<BiologicalProfileResponseDto> {
    return this.biologicalProfileService.upsertMine(user.sub, dto);
  }
}
