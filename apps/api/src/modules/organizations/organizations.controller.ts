import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma organização (usuário torna-se OWNER)' })
  @ApiResponse({ status: 201, type: OrganizationResponseDto })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista as organizações do usuário autenticado' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationDto) {
    return this.organizationsService.findMyOrganizations(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retorna organização por ID' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  findById(@Param('id') id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza organização (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete da organização (somente OWNER)' })
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.organizationsService.delete(id, user.sub);
  }
}
