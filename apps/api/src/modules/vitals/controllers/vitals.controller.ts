import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VitalsService } from '../services/vitals.service';
import { CreateVitalRecordDto } from '../dto/create-vital-record.dto';
import { UpdateVitalRecordDto } from '../dto/update-vital-record.dto';
import { FilterVitalsDto } from '../dto/filter-vitals.dto';
import { VitalRecordResponseDto } from '../dto/vital-record-response.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../identity/auth/types/jwt-payload.interface';

@ApiTags('vitals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Post('patients/:patientId/vitals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria registro de sinais vitais para um paciente' })
  @ApiResponse({ status: 201, type: VitalRecordResponseDto })
  create(
    @Param('patientId') patientId: string,
    @Body() dto: CreateVitalRecordDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<VitalRecordResponseDto> {
    return this.vitalsService.create(patientId, dto, user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('patients/:patientId/vitals')
  @ApiOperation({ summary: 'Lista registros vitais do paciente com filtros e paginação' })
  findAll(
    @Param('patientId') patientId: string,
    @Query() query: FilterVitalsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vitalsService.findAll(patientId, query, user);
  }

  @Get('vitals/:id')
  @ApiOperation({ summary: 'Retorna registro vital por ID (inclui histórico e biomarcadores)' })
  @ApiResponse({ status: 200, type: VitalRecordResponseDto })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<VitalRecordResponseDto> {
    return this.vitalsService.findOne(id, user);
  }

  @Put('vitals/:id')
  @ApiOperation({ summary: 'Atualiza registro vital (gera entrada no histórico de versões)' })
  @ApiResponse({ status: 200, type: VitalRecordResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVitalRecordDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<VitalRecordResponseDto> {
    return this.vitalsService.update(id, dto, user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Put('vitals/:id/validate')
  @ApiOperation({ summary: 'Valida um registro vital (somente profissionais e admins)' })
  @ApiResponse({ status: 200, type: VitalRecordResponseDto })
  validate(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<VitalRecordResponseDto> {
    return this.vitalsService.validate(id, user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete('vitals/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete do registro vital' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<void> {
    await this.vitalsService.remove(id, user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
