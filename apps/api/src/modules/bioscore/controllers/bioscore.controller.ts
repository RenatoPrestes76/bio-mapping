import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { BioScoreService } from '../services/bioscore.service.js';
import { SleepMetricsService } from '../services/sleep-metrics.service.js';
import { SportMetricsService } from '../services/sport-metrics.service.js';
import { RecoveryService } from '../services/recovery.service.js';
import { TrendsService } from '../services/trends.service.js';
import { AlertsService } from '../services/alerts.service.js';
import { CreateSleepMetricsDto } from '../dto/create-sleep-metrics.dto.js';
import { CreateSportMetricsDto } from '../dto/create-sport-metrics.dto.js';
import { FilterAlertsDto } from '../dto/alert-response.dto.js';

@ApiTags('BioScore')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BioScoreController {
  constructor(
    private readonly bioScoreService: BioScoreService,
    private readonly sleepService: SleepMetricsService,
    private readonly sportService: SportMetricsService,
    private readonly recoveryService: RecoveryService,
    private readonly trendsService: TrendsService,
    private readonly alertsService: AlertsService,
  ) {}

  // ── BioScore ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Computar e salvar BioScore do paciente' })
  @Post('patients/:patientId/bioscore/compute')
  computeBioScore(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.bioScoreService.computeBioScore(patientId);
  }

  @ApiOperation({ summary: 'Histórico de BioScore' })
  @Get('patients/:patientId/bioscore')
  findAllBioScore(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.bioScoreService.findAll(patientId);
  }

  @ApiOperation({ summary: 'BioScore mais recente' })
  @Get('patients/:patientId/bioscore/latest')
  findLatestBioScore(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.bioScoreService.findLatest(patientId);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Dashboard biométrico completo' })
  @Get('patients/:patientId/dashboard')
  getDashboard(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.bioScoreService.getDashboard(patientId);
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Registrar sessão de sono' })
  @Post('patients/:patientId/sleep')
  createSleep(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateSleepMetricsDto,
  ) {
    return this.sleepService.create(patientId, dto);
  }

  @ApiOperation({ summary: 'Histórico de sono' })
  @Get('patients/:patientId/sleep')
  findAllSleep(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.sleepService.findAll(patientId);
  }

  @ApiOperation({ summary: 'Registro de sono por ID' })
  @Get('sleep/:id')
  findSleepById(@Param('id', ParseUUIDPipe) id: string) {
    return this.sleepService.findById(id);
  }

  @ApiOperation({ summary: 'Deletar registro de sono' })
  @Delete('sleep/:id')
  deleteSleep(@Param('id', ParseUUIDPipe) id: string) {
    return this.sleepService.delete(id);
  }

  // ── Sport Metrics ─────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Registrar métricas esportivas' })
  @Post('patients/:patientId/sport')
  createSport(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateSportMetricsDto,
  ) {
    return this.sportService.create(patientId, dto);
  }

  @ApiOperation({ summary: 'Histórico de métricas esportivas' })
  @Get('patients/:patientId/sport')
  findAllSport(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('sport') sport?: string,
  ) {
    return this.sportService.findAll(patientId, sport);
  }

  @ApiOperation({ summary: 'Métricas esportivas por ID' })
  @Get('sport/:id')
  findSportById(@Param('id', ParseUUIDPipe) id: string) {
    return this.sportService.findById(id);
  }

  // ── Recovery ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Histórico de Recovery Score' })
  @Get('patients/:patientId/recovery')
  findAllRecovery(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.recoveryService.findAll(patientId);
  }

  @ApiOperation({ summary: 'Recovery Score mais recente' })
  @Get('patients/:patientId/recovery/latest')
  findLatestRecovery(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.recoveryService.findLatest(patientId);
  }

  // ── Trends ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Análise de tendências do paciente' })
  @Get('patients/:patientId/trends')
  findAllTrends(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.trendsService.findAll(patientId);
  }

  @ApiOperation({ summary: 'Computar e salvar tendências (todas as métricas)' })
  @Post('patients/:patientId/trends/compute')
  computeTrends(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('period') period: 'WEEKLY' | 'MONTHLY' | 'ANNUAL' = 'WEEKLY',
  ) {
    return this.trendsService.computeForPatient(patientId, period);
  }

  @ApiOperation({ summary: 'Tendência de uma métrica específica' })
  @Get('patients/:patientId/trends/:metric')
  findTrendByMetric(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('metric') metric: string,
  ) {
    return this.trendsService.findByMetric(patientId, metric);
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Listar alertas do paciente' })
  @Get('patients/:patientId/alerts')
  findAllAlerts(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() dto: FilterAlertsDto,
  ) {
    return this.alertsService.findAll(patientId, dto);
  }

  @ApiOperation({ summary: 'Marcar alerta como lido' })
  @Post('alerts/:id/read')
  markAlertRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.markRead(id);
  }

  @ApiOperation({ summary: 'Resolver alerta' })
  @Post('alerts/:id/resolve')
  resolveAlert(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.resolve(id);
  }
}
