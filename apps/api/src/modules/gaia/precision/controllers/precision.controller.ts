import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator.js';
import { PrecisionService } from '../services/precision.service.js';
import { CreateProfileDto } from '../dto/create-profile.dto.js';
import { CreateCarePlanDto } from '../dto/create-care-plan.dto.js';

@Controller('precision')
@UseGuards(JwtAuthGuard)
export class PrecisionController {
  constructor(private readonly service: PrecisionService) {}

  @Post('profile')
  createOrUpdateProfile(@Body() dto: CreateProfileDto, @CurrentUser() user: { sub: string }) {
    return this.service.createOrUpdateProfile(dto, user.sub);
  }

  @Get('profile/:patientId')
  findProfile(@Param('patientId') patientId: string) {
    return this.service.findProfile(patientId);
  }

  @Post('risk')
  calculateRisk(
    @Body() body: { patientId: string; baseRiskScore?: number; trendSlope?: number },
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.calculateRisk(body.patientId, user.sub, body.baseRiskScore, body.trendSlope);
  }

  @Get('recommendations')
  getRecommendations(@Query('patientId') patientId: string, @CurrentUser() user: { sub: string }) {
    return this.service.getRecommendations(patientId, user.sub);
  }

  @Post('care-plan')
  createCarePlan(@Body() dto: CreateCarePlanDto, @CurrentUser() user: { sub: string }) {
    return this.service.createCarePlan(dto, user.sub);
  }

  @Get('timeline')
  getTimeline(@Query('patientId') patientId: string, @Query('metric') metric?: string) {
    return this.service.getTimeline(patientId, metric);
  }
}
