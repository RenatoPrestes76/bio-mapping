import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface';

@ApiTags('invites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('organizations/:id/invite')
  @ApiOperation({ summary: 'Envia convite para um usuário (OWNER/ADMIN)' })
  @ApiResponse({ status: 201, type: InviteResponseDto })
  send(
    @Param('id') orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    return this.invitesService.send(orgId, user.sub, dto);
  }

  @Get('invites')
  @ApiOperation({ summary: 'Lista convites pendentes do usuário autenticado' })
  @ApiResponse({ status: 200, type: [InviteResponseDto] })
  listMyInvites(@CurrentUser() user: JwtPayload): Promise<InviteResponseDto[]> {
    return this.invitesService.listMyInvites(user.email);
  }

  @Post('invites/:token/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Aceita um convite' })
  async accept(@Param('token') token: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.invitesService.accept(token, user.sub, user.email);
  }

  @Post('invites/:token/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Recusa um convite' })
  async reject(@Param('token') token: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.invitesService.reject(token, user.sub, user.email);
  }
}
