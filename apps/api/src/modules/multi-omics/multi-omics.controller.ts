import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import { MultiOmicsService } from './multi-omics.service.js';
import { ImportProfileDto, IntegrateProfilesDto, NormalizeProfileDto } from './dto/omics.dto.js';

@Controller('multi-omics')
@UseGuards(JwtAuthGuard)
export class MultiOmicsController {
  constructor(private readonly service: MultiOmicsService) {}

  @Post('profile')
  importProfile(@Body() dto: ImportProfileDto, @CurrentUser() _user: { sub: string }) {
    return this.service.importProfile(dto);
  }

  @Post('integrate')
  integrateProfiles(@Body() dto: IntegrateProfilesDto, @CurrentUser() _user: { sub: string }) {
    return this.service.integrateProfiles(dto);
  }

  @Post('normalize')
  normalizeProfile(@Body() dto: NormalizeProfileDto, @CurrentUser() _user: { sub: string }) {
    return this.service.normalizeProfile(dto);
  }

  @Get('features/:patientId')
  getIntegratedFeatures(
    @Param('patientId') patientId: string,
    @CurrentUser() _user: { sub: string },
  ) {
    return this.service.getIntegratedFeatures(patientId);
  }

  @Get('profile/:id')
  getProfile(@Param('id') id: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getProfile(id);
  }

  @Get('integration/:id')
  getIntegration(@Param('id') id: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getIntegration(id);
  }
}
