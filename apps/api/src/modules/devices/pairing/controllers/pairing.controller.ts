import {
  Controller, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus,
  ParseUUIDPipe, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/guards/roles.guard';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator';
import { PairingService } from '../services/pairing.service';
import { PairDeviceDto } from '../dto/pair-device.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class PairingController {
  constructor(private readonly pairing: PairingService) {}

  @Post(':id/pair')
  pair(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PairDeviceDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.pairing.pair(id, dto, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Delete(':id/pair')
  @HttpCode(HttpStatus.NO_CONTENT)
  unpair(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.pairing.unpair(id, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }
}
