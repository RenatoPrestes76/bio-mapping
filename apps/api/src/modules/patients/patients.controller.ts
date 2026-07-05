import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria o registro de paciente do usuário autenticado' })
  @ApiResponse({ status: 201, type: PatientResponseDto })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePatientDto): Promise<PatientResponseDto> {
    return this.patientsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista pacientes com filtros e paginação' })
  findAll(@Query() query: SearchPatientsDto) {
    return this.patientsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retorna paciente por ID' })
  @ApiResponse({ status: 200, type: PatientResponseDto })
  findById(@Param('id') id: string): Promise<PatientResponseDto> {
    return this.patientsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza registro de paciente' })
  @ApiResponse({ status: 200, type: PatientResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientResponseDto> {
    return this.patientsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete do registro de paciente' })
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.patientsService.delete(id, user.sub);
  }
}
