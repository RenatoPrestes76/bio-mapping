import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/guards/roles.guard';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator';
import { TemplatesService } from '../services/templates.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { CreateSectionDto } from '../dto/create-section.dto';
import { CreateFieldDto } from '../dto/create-field.dto';
import { FilterTemplatesDto } from '../dto/filter-templates.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Post()
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: any, @Req() req: any) {
    return this.templates.create(dto, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Get()
  findAll(@Query() dto: FilterTemplatesDto, @CurrentUser() user: any) {
    return this.templates.findAll(dto, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateDto, @CurrentUser() user: any, @Req() req: any) {
    return this.templates.update(id, dto, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.templates.remove(id, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  @Post(':id/sections')
  @HttpCode(HttpStatus.CREATED)
  addSection(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateSectionDto, @CurrentUser() user: any) {
    return this.templates.addSection(id, dto, user);
  }

  @Put(':id/sections/:sectionId')
  updateSection(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: any,
  ) {
    return this.templates.updateSection(sectionId, dto, user);
  }

  @Delete(':id/sections/:sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSection(@Param('sectionId', ParseUUIDPipe) sectionId: string, @CurrentUser() user: any) {
    return this.templates.removeSection(sectionId, user);
  }

  // ── Fields ──────────────────────────────────────────────────────────────

  @Post(':id/sections/:sectionId/fields')
  @HttpCode(HttpStatus.CREATED)
  addField(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateFieldDto,
    @CurrentUser() user: any,
  ) {
    return this.templates.addField(sectionId, dto, user);
  }

  @Put(':id/sections/:sectionId/fields/:fieldId')
  updateField(
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() dto: CreateFieldDto,
    @CurrentUser() user: any,
  ) {
    return this.templates.updateField(fieldId, dto, user);
  }

  @Delete(':id/sections/:sectionId/fields/:fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeField(@Param('fieldId', ParseUUIDPipe) fieldId: string, @CurrentUser() user: any) {
    return this.templates.removeField(fieldId, user);
  }
}
