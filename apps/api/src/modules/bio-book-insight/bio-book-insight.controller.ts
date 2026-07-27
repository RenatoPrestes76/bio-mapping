import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BioBookInsightService } from './bio-book-insight.service.js';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
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
  analyze(@Body() dto: AnalyzeBioBookInsightDto): BioBookInsightResponseDto {
    const report = this.service.analyze(dto);
    return BioBookInsightResponseDto.fromReport(report);
  }

  @Get('insights/:patientId')
  getInsights(@Param('patientId') patientId: string): InsightsResponseDto {
    const report = this.service.getInsights(patientId);
    return InsightsResponseDto.fromReport(report);
  }

  @Get('reflection/:patientId')
  getReflection(@Param('patientId') patientId: string): ReflectionResponseDto {
    const report = this.service.getReflection(patientId);
    return ReflectionResponseDto.fromReport(report);
  }

  @Get('goals/:patientId')
  getGoals(@Param('patientId') patientId: string): GoalsResponseDto {
    const report = this.service.getGoals(patientId);
    return GoalsResponseDto.fromReport(report);
  }

  @Get('score-evolution/:patientId')
  getScoreEvolution(@Param('patientId') patientId: string): ScoreEvolutionResponseDto {
    const report = this.service.getScoreEvolution(patientId);
    return ScoreEvolutionResponseDto.fromReport(report);
  }

  @Get('current-chapter/:patientId')
  getCurrentChapter(@Param('patientId') patientId: string): CurrentChapterResponseDto {
    const report = this.service.getCurrentChapter(patientId);
    return CurrentChapterResponseDto.fromReport(report);
  }
}
