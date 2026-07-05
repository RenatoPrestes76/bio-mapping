import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.interface';
import { Role } from '@bio/database';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista e pesquisa usuários (somente ADMIN)' })
  @ApiResponse({ status: 200 })
  findAll(@Query() query: SearchUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna o perfil do usuário autenticado' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  getMe(@CurrentUser() user: JwtPayload): Promise<UserResponseDto> {
    return this.usersService.getMe(user.sub);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Retorna usuário por ID (somente ADMIN)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza nome, data de nascimento e/ou gênero do usuário autenticado' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Atualiza a senha do usuário autenticado e revoga todas as sessões' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.usersService.changePassword(user.sub, dto, req.ip);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Altera o status de um usuário (somente ADMIN)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.usersService.updateStatus(id, dto, actor.sub);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete de usuário (somente ADMIN)' })
  @ApiResponse({ status: 204 })
  async softDelete(@Param('id') id: string, @CurrentUser() actor: JwtPayload): Promise<void> {
    await this.usersService.softDelete(id, actor.sub);
  }
}
