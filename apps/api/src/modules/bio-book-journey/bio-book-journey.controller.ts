import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
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
  analyze(@Body() dto: AnalyzeBioBookJourneyDto): BioBookJourneyResponseDto {
    const report = this.service.analyze(dto);
    return BioBookJourneyResponseDto.fromReport(report);
  }

  @Get('path/:patientId')
  getPath(@Param('patientId') patientId: string): JourneyPathResponseDto {
    const report = this.service.getPath(patientId);
    return JourneyPathResponseDto.fromReport(report);
  }

  @Get('next-steps/:patientId')
  getNextSteps(@Param('patientId') patientId: string): NextStepsResponseDto {
    const report = this.service.getNextSteps(patientId);
    return NextStepsResponseDto.fromReport(report);
  }

  @Get('milestones/:patientId')
  getMilestones(@Param('patientId') patientId: string): MilestonePredictionsResponseDto {
    const report = this.service.getMilestones(patientId);
    return MilestonePredictionsResponseDto.fromReport(report);
  }
}
