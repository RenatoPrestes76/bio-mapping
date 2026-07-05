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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BiomarkersService } from '../services/biomarkers.service';
import { CreateBiomarkerDto } from '../dto/create-biomarker.dto';
import { UpdateBiomarkerDto } from '../dto/update-biomarker.dto';
import { BiomarkerResponseDto } from '../dto/biomarker-response.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../identity/auth/types/jwt-payload.interface';

@ApiTags('biomarkers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BiomarkersController {
  constructor(private readonly biomarkersService: BiomarkersService) {}

  @Post('vitals/:vitalRecordId/biomarkers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adiciona biomarcador a um registro vital' })
  @ApiResponse({ status: 201, type: BiomarkerResponseDto })
  create(
    @Param('vitalRecordId') vitalRecordId: string,
    @Body() dto: CreateBiomarkerDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<BiomarkerResponseDto> {
    return this.biomarkersService.create(vitalRecordId, dto, user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('vitals/:vitalRecordId/biomarkers')
  @ApiOperation({ summary: 'Lista biomarcadores de um registro vital' })
  @ApiResponse({ status: 200, type: [BiomarkerResponseDto] })
  findAll(
    @Param('vitalRecordId') vitalRecordId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<BiomarkerResponseDto[]> {
    return this.biomarkersService.findAll(vitalRecordId, user);
  }

  @Put('biomarkers/:id')
  @ApiOperation({ summary: 'Atualiza biomarcador' })
  @ApiResponse({ status: 200, type: BiomarkerResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBiomarkerDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<BiomarkerResponseDto> {
    return this.biomarkersService.update(id, dto, user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete('biomarkers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove biomarcador' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<void> {
    await this.biomarkersService.remove(id, user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
