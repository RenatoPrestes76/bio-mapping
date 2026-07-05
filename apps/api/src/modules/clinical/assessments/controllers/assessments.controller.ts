import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/guards/roles.guard';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator';
import { AssessmentsService } from '../services/assessments.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { FilterAssessmentsDto } from '../dto/filter-assessments.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Post('patients/:patientId/assessments')
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.assessments.create(patientId, dto, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Get('patients/:patientId/assessments/summary')
  summary(@Param('patientId', ParseUUIDPipe) patientId: string, @CurrentUser() user: any) {
    return this.assessments.summary(patientId, user);
  }

  @Get('patients/:patientId/assessments')
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string, @Query() dto: FilterAssessmentsDto, @CurrentUser() user: any) {
    return this.assessments.findAll(patientId, dto, user);
  }

  @Get('patients/:patientId/timeline')
  timeline(@Param('patientId', ParseUUIDPipe) patientId: string, @CurrentUser() user: any) {
    return this.assessments.timeline(patientId, user);
  }

  @Get('assessments')
  search(@Query() dto: FilterAssessmentsDto, @CurrentUser() user: any) {
    return this.assessments.search(dto, user);
  }

  @Get('assessments/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.assessments.findOne(id, user);
  }

  @Put('assessments/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.assessments.update(id, dto, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Put('assessments/:id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.assessments.complete(id, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Put('assessments/:id/validate')
  validate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.assessments.validate(id, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Put('assessments/:id/lock')
  lock(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.assessments.lock(id, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Delete('assessments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.assessments.remove(id, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }
}
