import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService, DeviceContext } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './types/jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cria uma conta e retorna access/refresh tokens' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.register(dto, this.deviceContext(dto, req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Autentica e retorna access/refresh tokens' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas. Tente novamente em 15 minutos.' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.login(dto, this.deviceContext(dto, req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotaciona o refresh token e emite um novo access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido, revogado ou expirado' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoga a sessão do refresh token informado' })
  @ApiResponse({ status: 204 })
  async logout(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<void> {
    await this.authService.logout(dto.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoga todas as sessões do usuário atual' })
  @ApiResponse({ status: 204 })
  async logoutAll(@CurrentUser() user: JwtPayload, @Req() req: Request): Promise<void> {
    await this.authService.logoutAll(user.sub, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista as sessões ativas do usuário atual' })
  @ApiResponse({ status: 200, type: [SessionResponseDto] })
  listSessions(@CurrentUser() user: JwtPayload): Promise<SessionResponseDto[]> {
    return this.authService.listSessions(user.sub);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoga uma sessão específica do usuário atual' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Sessão não encontrada ou pertence a outro usuário' })
  async revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('id') sessionId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.authService.revokeSession(user.sub, sessionId, { ip: req.ip });
  }

  private deviceContext(dto: { deviceName?: string; deviceType?: string }, req: Request): DeviceContext {
    return {
      deviceName: dto.deviceName,
      deviceType: dto.deviceType,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
