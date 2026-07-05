import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { SearchProfessionalsDto } from './dto/search-professionals.dto';
import { ProfessionalResponseDto } from './dto/professional-response.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface';

@ApiTags('professionals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria o registro profissional do usuário autenticado' })
  @ApiResponse({ status: 201, type: ProfessionalResponseDto })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProfessionalDto): Promise<ProfessionalResponseDto> {
    return this.professionalsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista profissionais com filtros e paginação' })
  findAll(@Query() query: SearchProfessionalsDto) {
    return this.professionalsService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna o registro profissional do usuário autenticado' })
  @ApiResponse({ status: 200, type: ProfessionalResponseDto })
  getMyProfessional(@CurrentUser() user: JwtPayload): Promise<ProfessionalResponseDto> {
    return this.professionalsService.findById(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retorna profissional por ID' })
  @ApiResponse({ status: 200, type: ProfessionalResponseDto })
  findById(@Param('id') id: string): Promise<ProfessionalResponseDto> {
    return this.professionalsService.findById(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza o registro profissional do usuário autenticado' })
  @ApiResponse({ status: 200, type: ProfessionalResponseDto })
  updateMine(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfessionalDto): Promise<ProfessionalResponseDto> {
    return this.professionalsService.updateMine(user.sub, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete do registro profissional do usuário autenticado' })
  async deleteMine(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.professionalsService.deleteMine(user.sub);
  }
}
