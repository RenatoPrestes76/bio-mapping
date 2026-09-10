import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BioBookInsightService } from './bio-book-insight.service.js';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface.js';
import {
  AnalyzeBioBookInsightDto,
  BioBookInsightResponseDto,
  InsightsResponseDto,
  ReflectionResponseDto,
  GoalsResponseDto,
  ScoreEvolutionResponseDto,
  CurrentChapterResponseDto,
} from './dto/bio-book-insight.dto.js';

@Controller('bio-book-insight')
@UseGuards(JwtAuthGuard)
export class BioBookInsightController {
  constructor(private readonly service: BioBookInsightService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeBioBookInsightDto, @CurrentUser() user: JwtPayload): BioBookInsightResponseDto {
    const report = this.service.analyze(dto, user);
    return BioBookInsightResponseDto.fromReport(report);
  }

  @Get('insights/:patientId')
  getInsights(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): InsightsResponseDto {
    const report = this.service.getInsights(patientId, user);
    return InsightsResponseDto.fromReport(report);
  }

  @Get('reflection/:patientId')
  getReflection(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): ReflectionResponseDto {
    const report = this.service.getReflection(patientId, user);
    return ReflectionResponseDto.fromReport(report);
  }

  @Get('goals/:patientId')
  getGoals(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): GoalsResponseDto {
    const report = this.service.getGoals(patientId, user);
    return GoalsResponseDto.fromReport(report);
  }

  @Get('score-evolution/:patientId')
  getScoreEvolution(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): ScoreEvolutionResponseDto {
    const report = this.service.getScoreEvolution(patientId, user);
    return ScoreEvolutionResponseDto.fromReport(report);
  }

  @Get('current-chapter/:patientId')
  getCurrentChapter(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): CurrentChapterResponseDto {
    const report = this.service.getCurrentChapter(patientId, user);
    return CurrentChapterResponseDto.fromReport(report);
  }
}
