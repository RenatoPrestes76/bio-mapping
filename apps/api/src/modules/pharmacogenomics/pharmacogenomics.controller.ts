import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import { PharmacogenomicsService } from './pharmacogenomics.service.js';
import { AnalyzePGxDto } from './dto/pharmacogenomics.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('pharmacogenomics')
export class PharmacogenomicsController {
  constructor(private readonly service: PharmacogenomicsService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzePGxDto, @CurrentUser() _user: { sub: string }) {
    return this.service.analyze(
      dto.patientId,
      dto.genotypes,
      dto.medications,
      dto.includeAlternatives ?? true,
    );
  }

  @Get('profile/:id')
  getProfile(@Param('id') id: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getProfile(id);
  }

  @Get('recommendations/:patientId')
  getRecommendations(@Param('patientId') patientId: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getRecommendations(patientId);
  }
}
