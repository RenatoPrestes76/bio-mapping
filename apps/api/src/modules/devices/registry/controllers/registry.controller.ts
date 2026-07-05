import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/guards/roles.guard';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator';
import { RegistryService } from '../services/registry.service';
import { SessionsService } from '../../sessions/services/sessions.service';
import { RegisterDeviceDto } from '../../pairing/dto/pair-device.dto';
import { FilterDevicesDto } from '../dto/filter-devices.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class RegistryController {
  constructor(
    private readonly registry: RegistryService,
    private readonly sessions: SessionsService,
  ) {}

  @Post()
  register(@Body() dto: RegisterDeviceDto, @CurrentUser() user: any, @Req() req: any) {
    return this.registry.register(dto, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Get()
  findAll(@Query() dto: FilterDevicesDto, @CurrentUser() user: any) {
    return this.registry.findAll(dto, user);
  }

  @Get('statistics')
  getStatistics(@CurrentUser() user: any) {
    return this.registry.getStatistics(user);
  }

  @Get('sessions')
  getSessions(@Query('page') page: number, @Query('limit') limit: number) {
    return this.sessions.findSessions(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.registry.findOne(id, user);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.registry.update(id, dto, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.registry.remove(id, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  // ── Session management ─────────────────────────────────────────────────────

  @Post(':id/sessions')
  startSession(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.sessions.startSession(id, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  endSession(@Param('sessionId', ParseUUIDPipe) sessionId: string, @CurrentUser() user: any, @Req() req: any) {
    return this.sessions.endSession(sessionId, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }
}
