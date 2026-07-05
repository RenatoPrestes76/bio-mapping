import {
  Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/guards/roles.guard';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator';
import { DiscoveryService } from '../services/discovery.service';
import { ReportDiscoveredDeviceDto } from '../dto/discovered-device.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices/discovery')
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  startScan(@CurrentUser() user: any) {
    return this.discovery.startScan(user);
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  stopScan(@CurrentUser() user: any) {
    return this.discovery.stopScan(user);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  reportDevice(@Body() dto: ReportDiscoveredDeviceDto) {
    return this.discovery.reportDevice(dto);
  }

  @Get()
  getDiscovered() {
    return this.discovery.getDiscovered();
  }

  @Get('status')
  getScanStatus() {
    return this.discovery.getScanStatus();
  }
}
