import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface.js';
import { BioBookJourneyService } from './bio-book-journey.service.js';
import {
  AnalyzeBioBookJourneyDto,
  BioBookJourneyResponseDto,
  JourneyPathResponseDto,
  NextStepsResponseDto,
  MilestonePredictionsResponseDto,
} from './dto/bio-book-journey.dto.js';

@Controller('bio-book-journey')
@UseGuards(JwtAuthGuard)
export class BioBookJourneyController {
  constructor(private readonly service: BioBookJourneyService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeBioBookJourneyDto, @CurrentUser() user: JwtPayload): BioBookJourneyResponseDto {
    const report = this.service.analyze(dto, user);
    return BioBookJourneyResponseDto.fromReport(report);
  }

  @Get('path/:patientId')
  getPath(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): JourneyPathResponseDto {
    const report = this.service.getPath(patientId, user);
    return JourneyPathResponseDto.fromReport(report);
  }

  @Get('next-steps/:patientId')
  getNextSteps(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): NextStepsResponseDto {
    const report = this.service.getNextSteps(patientId, user);
    return NextStepsResponseDto.fromReport(report);
  }

  @Get('milestones/:patientId')
  getMilestones(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): MilestonePredictionsResponseDto {
    const report = this.service.getMilestones(patientId, user);
    return MilestonePredictionsResponseDto.fromReport(report);
  }
}
