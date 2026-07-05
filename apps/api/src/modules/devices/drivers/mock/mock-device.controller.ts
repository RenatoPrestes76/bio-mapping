import {
  Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/guards/roles.guard';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator';
import { MockDeviceService } from './mock-device.service';
import type { SendMeasurementDto } from './mock-device.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices/mock')
export class MockDeviceController {
  constructor(private readonly mock: MockDeviceService) {}

  @Get('drivers')
  listDrivers() {
    return this.mock.listDrivers();
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  start(@Body() body: { deviceId: string; driverName: string }) {
    return this.mock.start(body.deviceId, body.driverName);
  }

  @Post('stop/:sessionId')
  @HttpCode(HttpStatus.OK)
  stop(@Param('sessionId') sessionId: string) {
    return this.mock.stop(sessionId);
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  send(@Body() dto: SendMeasurementDto, @CurrentUser() user: any, @Req() req: any) {
    return this.mock.send(dto, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Get('sessions')
  getSessions() {
    return this.mock.getAllSessions();
  }
}
