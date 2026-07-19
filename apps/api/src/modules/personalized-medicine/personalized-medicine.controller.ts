import { Controller, Post, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { PersonalizedMedicineService } from './personalized-medicine.service.js';
import { CreateProfileDto, UpdateProfileDto, GeneratePlanDto, CompareProfilesDto } from './dto/profile.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('personalized-medicine')
export class PersonalizedMedicineController {
  constructor(private readonly service: PersonalizedMedicineService) {}

  @Post('profile')
  createProfile(@Body() dto: CreateProfileDto) {
    return this.service.analyzeProfile(dto);
  }

  @Post('plan')
  generatePlan(@Body() dto: GeneratePlanDto) {
    return this.service.generatePlan(dto);
  }

  @Post('compare')
  compareProfiles(@Body() dto: CompareProfilesDto) {
    return this.service.compareProfiles(dto);
  }

  @Get('profile/:id')
  getProfile(@Param('id') id: string) {
    return this.service.getProfile(id);
  }

  @Get('plan/:id')
  getPlan(@Param('id') id: string) {
    return this.service.getPlan(id);
  }

  @Put('profile/:id')
  updateProfile(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.service.updateProfile(id, dto);
  }
}
