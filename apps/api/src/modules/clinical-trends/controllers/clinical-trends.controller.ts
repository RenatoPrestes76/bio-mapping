import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TrendStatus, TrendType } from '@bio/database';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { AnalyzeTrendsDto } from '../dto/analyze-trends.dto.js';
import { ClinicalTrendsService } from '../services/clinical-trends.service.js';

@UseGuards(JwtAuthGuard)
@Controller('clinical-trends')
export class ClinicalTrendsController {
  constructor(private readonly service: ClinicalTrendsService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeTrendsDto, @CurrentUser() user: { sub: string }) {
    return this.service.analyze(dto, user?.sub);
  }

  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('metric') metric?: string,
    @Query('status') status?: TrendStatus,
    @Query('trendType') trendType?: TrendType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (patientId) {
      return this.service.findByPatient(patientId, {
        metric,
        status,
        trendType,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      });
    }
    return this.service.findActive();
  }

  @Get('patient/:patientId')
  findByPatient(
    @Param('patientId') patientId: string,
    @Query('metric') metric?: string,
    @Query('status') status?: TrendStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.findByPatient(patientId, {
      metric,
      status,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.archive(id, user?.sub);
  }
}
