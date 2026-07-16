import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HealthPlatform } from '@bio/database';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator';
import { OracleService } from '../services/oracle.service.js';
import { ConnectSourceDto } from '../dto/connect-source.dto.js';
import { SyncSourceDto } from '../dto/sync-source.dto.js';
import { TimelineQueryDto } from '../dto/timeline-query.dto.js';
import { toSourceResponse } from '../dto/source-response.dto.js';
import { toSyncJobResponse } from '../dto/sync-job-response.dto.js';

interface JwtUser {
  sub: string;
  patientId?: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('oracle')
export class OracleController {
  constructor(private readonly oracle: OracleService) {}

  @Get('auth-url')
  getAuthUrl(
    @Query('platform') platform: HealthPlatform,
    @Query('redirectUri') redirectUri: string,
    @CurrentUser() user: JwtUser,
  ) {
    const patientId = user.patientId ?? user.sub;
    return { url: this.oracle.getAuthUrl(patientId, platform, redirectUri) };
  }

  @Post('connect')
  async connect(@Body() dto: ConnectSourceDto, @CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    const source = await this.oracle.connect(patientId, dto);
    return toSourceResponse(source);
  }

  @Delete('connect/:platform')
  async disconnect(@Param('platform') platform: HealthPlatform, @CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    await this.oracle.disconnect(patientId, platform);
    return { message: 'Disconnected successfully' };
  }

  @Post('sync')
  async sync(@Body() dto: SyncSourceDto, @CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    return this.oracle.sync(patientId, dto.platform, dto.daysSince);
  }

  @Get('sources')
  async getSources(@CurrentUser() user: JwtUser) {
    const patientId = user.patientId ?? user.sub;
    const sources = await this.oracle.getSources(patientId);
    return sources.map(toSourceResponse);
  }

  @Get('sync/history')
  async getSyncHistory(
    @CurrentUser() user: JwtUser,
    @Query('limit') limit?: string,
  ) {
    const patientId = user.patientId ?? user.sub;
    const jobs = await this.oracle.getSyncHistory(patientId, limit ? parseInt(limit, 10) : 20);
    return jobs.map(toSyncJobResponse);
  }

  @Get('timeline')
  async getTimeline(
    @CurrentUser() user: JwtUser,
    @Query() query: TimelineQueryDto,
  ) {
    const patientId = user.patientId ?? user.sub;
    return this.oracle.getTimeline(patientId, query);
  }
}
