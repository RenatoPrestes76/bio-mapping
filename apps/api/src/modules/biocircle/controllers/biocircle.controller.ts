import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { BioCircleService } from '../services/biocircle.service.js';
import { SendInviteDto } from '../dto/send-invite.dto.js';
import { UpdatePrivacyDto } from '../dto/update-privacy.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('biocircle')
export class BioCircleController {
  constructor(private readonly service: BioCircleService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: { sub: string }) {
    return this.service.getDashboard(user.sub);
  }

  @Get('search')
  searchUsers(@Query('q') q: string, @CurrentUser() user: { sub: string }) {
    return this.service.searchUsers(q ?? '', user.sub);
  }

  @Post('connect')
  sendInvite(@Body() dto: SendInviteDto, @CurrentUser() user: { sub: string }) {
    return this.service.sendInvite(user.sub, dto);
  }

  @Get('connections')
  findConnections(@CurrentUser() user: { sub: string }) {
    return this.service.findConnections(user.sub);
  }

  @Get('invites/received')
  findReceived(@CurrentUser() user: { sub: string }) {
    return this.service.findReceivedInvites(user.sub);
  }

  @Get('invites/sent')
  findSent(@CurrentUser() user: { sub: string }) {
    return this.service.findSentInvites(user.sub);
  }

  @Patch('connections/:id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.accept(id, user.sub);
  }

  @Patch('connections/:id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.reject(id, user.sub);
  }

  @Patch('connections/:id/block')
  block(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.block(id, user.sub);
  }

  @Delete('connections/:id')
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.remove(id, user.sub);
  }

  @Get('settings/privacy')
  getPrivacy(@CurrentUser() user: { sub: string }) {
    return this.service.getPrivacySettings(user.sub);
  }

  @Put('settings/privacy')
  updatePrivacy(@Body() dto: UpdatePrivacyDto, @CurrentUser() user: { sub: string }) {
    return this.service.updatePrivacySettings(user.sub, dto);
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: { sub: string }) {
    return this.service.getNotifications(user.sub);
  }

  @Patch('notifications/:id/read')
  markRead(@Param('id') id: string) {
    return this.service.markNotificationRead(id);
  }

  @Patch('notifications/read-all')
  markAllRead(@CurrentUser() user: { sub: string }) {
    return this.service.markAllNotificationsRead(user.sub);
  }
}
