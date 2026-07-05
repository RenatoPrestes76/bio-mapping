import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipResponseDto } from './dto/membership-response.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('membership')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/members')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  @ApiOperation({ summary: 'Lista membros da organização (paginado)' })
  listMembers(@Param('orgId') orgId: string, @Query() query: PaginationDto) {
    return this.membershipService.listMembers(orgId, query);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Atualiza o cargo de um membro (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, type: MembershipResponseDto })
  updateRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateMembershipDto,
  ): Promise<MembershipResponseDto> {
    return this.membershipService.updateRole(orgId, userId, actor.sub, dto);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um membro da organização (OWNER/ADMIN)' })
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<void> {
    await this.membershipService.removeMember(orgId, userId, actor.sub);
  }
}
