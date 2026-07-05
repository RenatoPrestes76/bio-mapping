import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Patch, Post, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface';

const avatarFilter = (_req: any, file: any, cb: any) => {
  if (/image\/(jpeg|png|webp|gif)/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Apenas imagens são permitidas (jpeg, png, webp, gif)'), false);
  }
};

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Cria o perfil do usuário autenticado' })
  @ApiResponse({ status: 201, type: ProfileResponseDto })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProfileDto): Promise<ProfileResponseDto> {
    return this.profilesService.create(user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna o perfil do usuário autenticado' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  getMyProfile(@CurrentUser() user: JwtPayload): Promise<ProfileResponseDto> {
    return this.profilesService.getMyProfile(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza o perfil do usuário autenticado' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    return this.profilesService.update(user.sub, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete do perfil do usuário autenticado' })
  @ApiResponse({ status: 204 })
  async delete(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.profilesService.delete(user.sub);
  }

  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Faz upload do avatar do usuário autenticado' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @UseInterceptors(
    FileInterceptor('avatar', {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      storage: require('multer').memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: avatarFilter,
    }),
  )
  uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProfileResponseDto> {
    if (!file) throw new BadRequestException('Arquivo de imagem obrigatório');
    return this.profilesService.uploadAvatar(user.sub, file);
  }
}
