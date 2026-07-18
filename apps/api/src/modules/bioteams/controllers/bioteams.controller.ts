import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { BioTeamsService } from '../services/bioteams.service.js';
import type { CreateTeamDto } from '../dto/create-team.dto.js';
import type { UpdateTeamDto } from '../dto/update-team.dto.js';
import type { InviteMemberDto } from '../dto/invite-member.dto.js';
import type { UpdateMemberRoleDto } from '../dto/update-member-role.dto.js';
import type { CreateEventDto } from '../dto/create-event.dto.js';

@Controller('bioteams')
@UseGuards(JwtAuthGuard)
export class BioTeamsController {
  constructor(private readonly service: BioTeamsService) {}

  @Post()
  createTeam(@Body() dto: CreateTeamDto, @CurrentUser() user: { sub: string }) {
    return this.service.createTeam(dto, user.sub);
  }

  @Get()
  getMyTeams(@CurrentUser() user: { sub: string }) {
    return this.service.findMyTeams(user.sub);
  }

  @Get(':id')
  getTeam(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.findTeamById(id, user.sub);
  }

  @Patch(':id')
  updateTeam(@Param('id') id: string, @Body() dto: UpdateTeamDto, @CurrentUser() user: { sub: string }) {
    return this.service.updateTeam(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTeam(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.deleteTeam(id, user.sub);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.getMembers(id, user.sub);
  }

  @Post(':id/invite')
  inviteMember(@Param('id') id: string, @Body() dto: InviteMemberDto, @CurrentUser() user: { sub: string }) {
    return this.service.inviteMember(id, dto, user.sub);
  }

  @Post(':id/join')
  joinByCode(@Param('id') _id: string, @Body('code') code: string, @CurrentUser() user: { sub: string }) {
    return this.service.joinByCode(code, user.sub);
  }

  @Post(':id/accept')
  acceptInvite(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.acceptInvite(id, user.sub);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: { sub: string }) {
    return this.service.removeMember(id, userId, user.sub);
  }

  @Patch(':id/members/:userId/role')
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.updateMemberRole(id, dto, userId, user.sub);
  }

  @Get(':id/events')
  getEvents(
    @Param('id') id: string,
    @Query('upcoming') upcoming: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.getEvents(id, user.sub, upcoming === 'true');
  }

  @Post(':id/events')
  createEvent(@Param('id') id: string, @Body() dto: CreateEventDto, @CurrentUser() user: { sub: string }) {
    return this.service.createEvent(id, dto, user.sub);
  }

  @Patch(':id/events/:eventId')
  updateEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Body() dto: Partial<CreateEventDto>,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.updateEvent(id, eventId, dto, user.sub);
  }

  @Delete(':id/events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEvent(@Param('id') id: string, @Param('eventId') eventId: string, @CurrentUser() user: { sub: string }) {
    return this.service.deleteEvent(id, eventId, user.sub);
  }

  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.getDashboard(id, user.sub);
  }

  @Get(':id/mural')
  getMural(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.getMural(id, user.sub);
  }

  @Post(':id/events/:eventId/generate-chapter')
  @HttpCode(HttpStatus.NO_CONTENT)
  generateEventChapter(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.generateChapterForEvent(id, eventId, user.sub);
  }
}
